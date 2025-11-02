# Google OAuth Setup for ContentForge

## Quick Setup

Google OAuth is now integrated! Users can sign in with their Google account, which will automatically:
- Create their account in Supabase Auth
- Create their profile in the database
- Create a personal team
- Set up team membership

## Supabase Configuration

### 1. Enable Google Provider in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list
4. Toggle it **ON**
5. You'll need to configure Google OAuth credentials (see below)

### 2. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Configure:
   - **Name**: ContentForge
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - (Find your Supabase project URL in Settings → API)

### 3. Add Credentials to Supabase

1. Copy your **Client ID** and **Client Secret** from Google Cloud Console
2. In Supabase Dashboard → **Authentication** → **Providers** → **Google**:
   - Paste **Client ID**
   - Paste **Client Secret**
   - Click **Save**

### 4. Configure Redirect URLs

In Supabase Dashboard → **Authentication** → **URL Configuration**:

- **Site URL**: Your app URL (e.g., `http://localhost:3000` or `https://yourdomain.com`)
- **Redirect URLs**: Add:
  - `http://localhost:3000/**`
  - `https://yourdomain.com/**`

## Testing

1. Start your dev server: `npm run dev`
2. Go to the login page
3. Click **"Continue with Google"**
4. You should be redirected to Google for authorization
5. After authorizing, you'll be redirected back and automatically logged in
6. The user, team, and membership will be created automatically!

## For Your Colleague/Presentation

Just share the login page URL and they can:
1. Click "Continue with Google"
2. Sign in with their Google account
3. Everything is set up automatically!

No password needed - just their Google account! 🎉

## Troubleshooting

**"Provider not enabled" error:**
- Make sure Google provider is toggled ON in Supabase Dashboard

**"Redirect URI mismatch" error:**
- Check that the redirect URI in Google Console matches your Supabase callback URL
- Format: `https://[project-ref].supabase.co/auth/v1/callback`

**User not created in database:**
- Check that the `/api/users/upsert` endpoint is working
- The SIGNED_IN event should trigger automatically
- Check browser console for any errors

