import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { openRouter } from '@/lib/openrouter'
import { envServer } from '@/lib/env-server'

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await request.json()

    if (!userId || !teamId) {
      return NextResponse.json(
        { error: 'User ID and Team ID are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      envServer.NEXT_PUBLIC_SUPABASE_URL,
      envServer.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch client profile (onboarding data)
    const { data: profileData } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Fetch previous content (last 20 pieces)
    const { data: previousContent } = await supabase
      .from('content_documents')
      .select('title, topic, metadata, platform')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Build context from client profile
    const clientContext: string[] = []
    if (profileData) {
      if (profileData.name) clientContext.push(`Company: ${profileData.name}`)
      if (profileData.industry) clientContext.push(`Industry: ${profileData.industry}`)
      if (profileData.target_audience) clientContext.push(`Target Audience: ${profileData.target_audience}`)
      if (profileData.brand_voice) clientContext.push(`Brand Voice: ${profileData.brand_voice}`)
      if (profileData.goals && profileData.goals.length > 0) {
        clientContext.push(`Content Goals: ${profileData.goals.join(', ')}`)
      }
      if (profileData.seo_keywords && profileData.seo_keywords.length > 0) {
        clientContext.push(`SEO Keywords: ${profileData.seo_keywords.join(', ')}`)
      }
    }

    // Extract topics and keywords from previous content
    const previousTopics: string[] = []
    const previousKeywords: Set<string> = new Set()
    const contentThemes: string[] = []

    if (previousContent && previousContent.length > 0) {
      previousContent.forEach((doc: any) => {
        if (doc.topic) previousTopics.push(doc.topic)
        if (doc.title) contentThemes.push(doc.title)
        if (doc.metadata) {
          const metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata
          if (metadata.keywords && Array.isArray(metadata.keywords)) {
            metadata.keywords.forEach((kw: string) => previousKeywords.add(kw.toLowerCase()))
          }
          if (metadata.topic) previousTopics.push(metadata.topic)
        }
      })
    }

    // Build the AI prompt
    let prompt = `Generate 8-12 relevant content topic suggestions for this client based on their profile and previous content.`

    if (clientContext.length > 0) {
      prompt += `\n\nClient Profile:\n${clientContext.join('\n')}`
    }

    if (previousTopics.length > 0 || contentThemes.length > 0) {
      prompt += `\n\nPrevious Content Analysis:`
      if (previousTopics.length > 0) {
        const uniqueTopics = [...new Set(previousTopics)].slice(0, 10)
        prompt += `\n- Topics covered: ${uniqueTopics.join(', ')}`
      }
      if (contentThemes.length > 0) {
        prompt += `\n- Recent titles: ${contentThemes.slice(0, 5).join(', ')}`
      }
      if (previousKeywords.size > 0) {
        const keywordsArray = Array.from(previousKeywords).slice(0, 15)
        prompt += `\n- Keywords used: ${keywordsArray.join(', ')}`
      }
      prompt += `\n\nGenerate topics that:`
      prompt += `\n1. Align with their industry and audience`
      prompt += `\n2. Build upon or expand their previous content themes`
      prompt += `\n3. Are relevant to their brand voice and goals`
      prompt += `\n4. Offer variety while staying on-brand`
    } else {
      prompt += `\n\nThis is a new client with no previous content. Generate foundational topics that:`
      prompt += `\n1. Align with their industry and target audience`
      prompt += `\n2. Support their content goals`
      prompt += `\n3. Are appropriate for their brand voice`
    }

    prompt += `\n\nReturn a JSON array of topic objects, each with:`
    prompt += `\n- topic: A concise, engaging topic title (max 60 characters)`
    prompt += `\n- trending_score: A number between 70-100 indicating relevance`
    prompt += `\n- keywords: An array of 3-5 relevant keywords`
    prompt += `\n- content_angle: A brief description of the content angle/approach`
    prompt += `\n- target_audience: Who this topic appeals to`
    prompt += `\n\nFormat as a valid JSON array only, no markdown or additional text.`

    // Generate topic suggestions using AI
    const completion = await openRouter.generateContent({
      model: 'openai/gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a content strategist that generates highly relevant topic suggestions based on client profiles and content history. Return only valid JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000
    })

    const responseText = completion.choices[0]?.message?.content || '[]'
    
    // Parse the JSON response
    let topics: any[] = []
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      const jsonString = jsonMatch ? jsonMatch[0] : responseText
      topics = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Response text:', responseText)
      // Fallback: try to construct basic topics from the response
      topics = []
    }

    // Validate and format topics
    const formattedTopics = topics
      .filter((t: any) => t && typeof t === 'object' && t.topic)
      .map((t: any) => ({
        topic: String(t.topic || '').trim(),
        trending_score: typeof t.trending_score === 'number' ? t.trending_score : 85,
        keywords: Array.isArray(t.keywords) ? t.keywords : [],
        content_angle: String(t.content_angle || '').trim(),
        target_audience: String(t.target_audience || '').trim()
      }))
      .filter((t: any) => t.topic.length > 0)
      .slice(0, 12) // Limit to 12 topics

    // If we got good results, return them
    if (formattedTopics.length > 0) {
      return NextResponse.json({ topics: formattedTopics })
    }

    // Fallback: Generate basic topics if AI failed
    const fallbackTopics = [
      {
        topic: `${profileData?.industry || 'Business'} Best Practices`,
        trending_score: 85,
        keywords: [profileData?.industry?.toLowerCase() || 'business', 'best practices', 'tips'],
        content_angle: `Essential best practices for ${profileData?.industry || 'your industry'}`,
        target_audience: profileData?.target_audience || 'Business professionals'
      },
      {
        topic: `Innovation in ${profileData?.industry || 'Your Industry'}`,
        trending_score: 82,
        keywords: ['innovation', 'trends', profileData?.industry?.toLowerCase() || 'business'],
        content_angle: `Exploring innovative approaches in ${profileData?.industry || 'your field'}`,
        target_audience: profileData?.target_audience || 'Industry leaders'
      }
    ]

    return NextResponse.json({ topics: fallbackTopics })

  } catch (error) {
    console.error('Error generating topic suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate topic suggestions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

