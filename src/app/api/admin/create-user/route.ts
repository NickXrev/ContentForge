import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { envServer } from '@/lib/env-server'

/**
 * Admin endpoint to create test users
 * This creates a user with auth, profile, team, and team membership
 * 
 * POST /api/admin/create-user
 * Body: { email: string, password: string, full_name: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Basic auth check - you can add more security later
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.ADMIN_API_TOKEN || 'dev-admin-token-123'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, password, full_name } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, full_name' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      envServer.NEXT_PUBLIC_SUPABASE_URL,
      envServer.SUPABASE_SERVICE_ROLE_KEY
    )

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'User already exists',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          existed: true
        }
      })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) {
      return NextResponse.json(
        { error: 'Failed to create auth user', message: authError.message },
        { status: 500 }
      )
    }

    // Create user profile and team (this endpoint handles it)
    const upsertRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/users/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: authData.user.id,
        email,
        full_name
      })
    })

    const upsertData = await upsertRes.json()

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email,
        full_name,
        teamId: upsertData.teamId,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`,
        credentials: {
          email,
          password: password // Only return in dev environments
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create user', message: error.message },
      { status: 500 }
    )
  }
}

