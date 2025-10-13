import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { envServer } from '@/lib/env-server'
import type { NextFetchRequestConfig } from 'next/dist/server/web/spec-extension/fetch-event'

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const supabase = createClient(envServer.NEXT_PUBLIC_SUPABASE_URL, envServer.SUPABASE_SERVICE_ROLE_KEY)

    // Check if user already exists by exact email match
    const existing = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existingUser = existing.data?.users?.find((u: any) => u.email === email)
    if (existingUser) {
      return NextResponse.json({ ok: true, user: existingUser, existed: true })
    }

    // Create new user via Supabase admin
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (error) {
      return NextResponse.json({
        error: 'Admin signup failed',
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
        raw: error
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true, user: data.user })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


