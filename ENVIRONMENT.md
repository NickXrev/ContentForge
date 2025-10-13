### Environment variables

Set these in your local `.env` and in Vercel Project Settings → Environment Variables.

- NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anon key (client)
- SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (server-only)
- NEXT_PUBLIC_APP_URL: App base URL (e.g., http://localhost:3000, https://your-domain)
- LINKEDIN_CLIENT_ID: LinkedIn OAuth client id
- LINKEDIN_CLIENT_SECRET: LinkedIn OAuth client secret
- Optional: OPENAI_API_KEY, OPENROUTER_API_KEY, PERPLEXITY_API_KEY

Notes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` on the client. Set it only in server environments (Vercel env vars) and reference it in server code only.
- `NEXT_PUBLIC_*` variables are exposed to the browser; do not put secrets there.
