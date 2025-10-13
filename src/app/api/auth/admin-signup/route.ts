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

    // If user already exists, short-circuit
    const existing = await supabase.auth.admin.listUsers({ page: 1, perPage: 1, email })
    if ((existing as any)?.data?.users?.length) {
      return NextResponse.json({ ok: true, user: (existing as any).data.users[0], existed: true })
    }

    // Call GoTrue Admin REST directly to capture full error payload
    const url = `${envServer.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`
    const resp = await fetch(url as any, {
      method: 'POST',
      headers: {
        'apikey': envServer.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${envServer.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      })
    } as RequestInit)

    const text = await resp.text()
    let body: any
    try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }

    if (!resp.ok) {
      return NextResponse.json({ error: 'Admin signup failed', status: resp.status, body }, { status: 500 })
    }

    return NextResponse.json({ ok: true, user: body?.user || body })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


