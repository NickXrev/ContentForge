### Vercel + Supabase setup

1) Supabase project settings → API
- Copy Project URL → set as `NEXT_PUBLIC_SUPABASE_URL`
- Copy anon key → set as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy service role key → set as `SUPABASE_SERVICE_ROLE_KEY` (server-only)

2) Vercel → Project Settings → Environment Variables
- Add the vars above for Production, Preview, and Development
- Add `NEXT_PUBLIC_APP_URL` (e.g., your domain or `http://localhost:3000` for dev)
- Add LinkedIn: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` if using LinkedIn OAuth
- Redeploy after saving

3) Supabase Auth settings → URL configuration
- Site URL: set to your public app URL (e.g., `https://your-domain`)
- Additional redirect URLs: include
  - `http://localhost:3000`
  - `https://your-domain`

4) LinkedIn OAuth (if used)
- Authorized redirect URL: `${NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`

5) Local development
- Create `.env` in `contentforge/` with values from `ENVIRONMENT.md`
- Run: `npm run dev`

6) Security checks
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is only referenced in server files, like API routes or server utilities (`src/lib/supabase-server.ts`).
- Do not use the service key in client components. Client should import `src/lib/supabase.ts` which uses the anon key.






