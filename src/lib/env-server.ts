export const envServer = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '',
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ?? '',
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET ?? ''
}

export function assertServerEnv() {
  const missing: string[] = []
  if (!envServer.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!envServer.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!envServer.NEXT_PUBLIC_APP_URL) missing.push('NEXT_PUBLIC_APP_URL')
  return { missing }
}






