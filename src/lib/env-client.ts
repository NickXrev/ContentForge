export const envClient = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? ''
}

export function assertClientEnv() {
  const missing: string[] = []
  if (!envClient.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!envClient.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!envClient.NEXT_PUBLIC_APP_URL) missing.push('NEXT_PUBLIC_APP_URL')
  if (missing.length) {
    // Do not throw in browser by default; leave for health check route.
    // Consumers can optionally throw if needed.
    // console.warn('Missing client env vars:', missing)
  }
  return { missing }
}
