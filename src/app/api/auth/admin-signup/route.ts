import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { envServer } from '@/lib/env-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const supabase = createClient(envServer.NEXT_PUBLIC_SUPABASE_URL, envServer.SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true
    })

    if (error) {
      return NextResponse.json({
        error: 'Admin signup failed',
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true, user: data.user })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


