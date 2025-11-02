import { NextRequest, NextResponse } from 'next/server'
import { assertServerEnv, envServer } from '@/lib/env-server'
import { envClient } from '@/lib/env-client'
import { createClient } from '@supabase/supabase-js'

export async function GET(_req: NextRequest) {
  const serverMissing = assertServerEnv().missing
  const clientMissing = [] as string[]
  if (!envClient.NEXT_PUBLIC_SUPABASE_URL) clientMissing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!envClient.NEXT_PUBLIC_SUPABASE_ANON_KEY) clientMissing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!envClient.NEXT_PUBLIC_APP_URL) clientMissing.push('NEXT_PUBLIC_APP_URL')

  const summary = {
    server: {
      missing: serverMissing
    },
    client: {
      missing: clientMissing
    }
  }

  // Try a minimal Supabase server-side auth check if env present
  let supabaseOk: boolean | undefined = undefined
  let supabaseError: string | undefined = undefined
  if (!serverMissing.length) {
    try {
      const sb = createClient(envServer.NEXT_PUBLIC_SUPABASE_URL, envServer.SUPABASE_SERVICE_ROLE_KEY)
      // cheap no-op: request RLS-protected table schema via a lightweight select
      const { error } = await sb.from('users').select('id').limit(1)
      supabaseOk = !error
      supabaseError = error?.message
    } catch (e: any) {
      supabaseOk = false
      supabaseError = e?.message || 'Unknown error'
    }
  }

  return NextResponse.json({ summary, supabaseOk, supabaseError })
}






