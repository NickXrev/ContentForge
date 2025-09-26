import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // LinkedIn OAuth configuration
    const clientId = process.env.LINKEDIN_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`
    
    if (!clientId) {
      return NextResponse.json({ error: 'LinkedIn client ID not configured' }, { status: 500 })
    }

    // Generate state parameter for security
    const state = Buffer.from(JSON.stringify({ teamId, timestamp: Date.now() })).toString('base64')
    
    // LinkedIn OAuth scopes
    const scopes = [
      'r_liteprofile',           // Read basic profile info
      'r_emailaddress',          // Read email address
      'w_member_social'          // Post content to LinkedIn
    ].join(' ')

    // Build LinkedIn authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('scope', scopes)

    // Redirect to LinkedIn
    return NextResponse.redirect(authUrl.toString())
    
  } catch (error) {
    console.error('LinkedIn OAuth initiation error:', error)
    return NextResponse.json({ error: 'Failed to initiate LinkedIn OAuth' }, { status: 500 })
  }
}
