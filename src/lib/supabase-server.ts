import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { envServer } from './env-server'

const supabaseUrl = envServer.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envServer.SUPABASE_SERVICE_ROLE_KEY

// Server-side Supabase client with service role key for admin operations
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}








