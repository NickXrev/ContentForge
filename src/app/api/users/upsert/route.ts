import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { envServer } from '@/lib/env-server'

export async function POST(request: NextRequest) {
  try {
    const { id, email, full_name } = await request.json()

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })
    }

    const supabase = createClient(envServer.NEXT_PUBLIC_SUPABASE_URL, envServer.SUPABASE_SERVICE_ROLE_KEY)

    const { error } = await supabase
      .from('users')
      .upsert(
        {
          id,
          email,
          full_name: full_name || null,
          role: 'editor'
        },
        { onConflict: 'id' }
      )

    if (error) {
      return NextResponse.json(
        {
          error: 'User upsert failed',
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
