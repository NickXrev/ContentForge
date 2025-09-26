import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('LinkedIn OAuth error:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=missing_code_or_state`)
    }

    // Decode and validate state
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch (e) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=invalid_state`)
    }

    const { teamId } = stateData

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('LinkedIn token exchange error:', errorData)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, expires_in } = tokenData

    // Get user profile information
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    if (!profileResponse.ok) {
      console.error('LinkedIn profile fetch error:', await profileResponse.text())
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=profile_fetch_failed`)
    }

    const profileData = await profileResponse.json()
    
    // Get email address
    const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    let email = ''
    if (emailResponse.ok) {
      const emailData = await emailResponse.json()
      email = emailData.elements?.[0]?.['handle~']?.emailAddress || ''
    }

    // Store account in database
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from('social_accounts')
      .insert({
        team_id: teamId,
        platform: 'linkedin',
        platform_user_id: profileData.id,
        username: `${profileData.firstName?.localized?.en_US || ''} ${profileData.lastName?.localized?.en_US || ''}`.trim(),
        email: email,
        profile_picture_url: profileData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier || '',
        access_token: access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: new Date(Date.now() + (expires_in * 1000)).toISOString(),
        is_active: true,
        connected_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=database_error`)
    }

    // Redirect back to accounts page with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/accounts?success=linkedin_connected`)

  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=callback_error`)
  }
}
