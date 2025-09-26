import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PublishingService } from '@/lib/publishing/PublishingService'

export async function POST(request: NextRequest) {
  try {
    const { contentId, socialAccountId, scheduledAt } = await request.json()

    if (!contentId || !socialAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: contentId, socialAccountId' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's team
    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (teamError || !teamData) {
      return NextResponse.json({ error: 'User not part of any team' }, { status: 400 })
    }

    // Get content document
    const { data: content, error: contentError } = await supabase
      .from('content_documents')
      .select('*')
      .eq('id', contentId)
      .eq('team_id', teamData.team_id)
      .single()

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Get social account
    const { data: socialAccount, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', socialAccountId)
      .eq('team_id', teamData.team_id)
      .single()

    if (accountError || !socialAccount) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    if (!socialAccount.is_active) {
      return NextResponse.json({ error: 'Social account is not active' }, { status: 400 })
    }

    // Prepare content for publishing
    const publishRequest = {
      contentId: content.id,
      platform: socialAccount.platform,
      accountId: socialAccount.id,
      content: {
        text: content.content,
        media: content.metadata?.media_url ? {
          type: content.metadata.media_type || 'image',
          url: content.metadata.media_url
        } : undefined
      },
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      metadata: {
        hashtags: content.hashtags || [],
        topic: content.topic
      }
    }

    // Initialize publishing service
    const publishingService = new PublishingService([socialAccount])

    // Publish immediately or schedule
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      // Schedule for later
      const { data: queueItem, error: queueError } = await supabase
        .from('publishing_queue')
        .insert({
          team_id: teamData.team_id,
          content_id: content.id,
          social_account_id: socialAccount.id,
          platform: socialAccount.platform,
          content_text: content.content,
          media_urls: content.metadata?.media_url ? [content.metadata.media_url] : [],
          hashtags: content.hashtags || [],
          scheduled_at: new Date(scheduledAt),
          metadata: publishRequest.metadata
        })
        .select()
        .single()

      if (queueError) {
        console.error('Queue error:', queueError)
        return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Post scheduled successfully',
        queueId: queueItem.id,
        scheduledAt: queueItem.scheduled_at
      })
    } else {
      // Publish immediately
      const result = await publishingService.publishPost(publishRequest)

      if (result.success) {
        // Record in publishing history
        const { error: historyError } = await supabase
          .from('publishing_history')
          .insert({
            team_id: teamData.team_id,
            content_id: content.id,
            social_account_id: socialAccount.id,
            platform: socialAccount.platform,
            platform_post_id: result.postId || '',
            content_text: content.content,
            media_count: content.metadata?.media_url ? 1 : 0,
            hashtag_count: content.hashtags?.length || 0,
            published_at: new Date(),
            status: 'published'
          })

        if (historyError) {
          console.error('History error:', historyError)
        }

        // Update content status
        await supabase
          .from('content_documents')
          .update({ 
            status: 'published',
            published_at: new Date(),
            published_url: result.postId
          })
          .eq('id', content.id)
      }

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Post published successfully' : 'Failed to publish post',
        postId: result.postId,
        error: result.error
      })
    }
  } catch (error) {
    console.error('Publishing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's team
    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (teamError || !teamData) {
      return NextResponse.json({ error: 'User not part of any team' }, { status: 400 })
    }

    // Get publishing queue
    const { data: queue, error: queueError } = await supabase
      .from('publishing_queue')
      .select(`
        *,
        content_documents(title, content),
        social_accounts(account_name, platform)
      `)
      .eq('team_id', teamData.team_id)
      .order('scheduled_at', { ascending: true })

    if (queueError) {
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    return NextResponse.json({ queue })
  } catch (error) {
    console.error('Queue fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
