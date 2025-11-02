# Enable Google OAuth in Supabase - Quick Steps

## Step 1: Enable Google Provider in Supabase Dashboard

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **Providers** tab

3. **Enable Google**
   - Find **Google** in the providers list
   - Toggle the switch to **ON**

4. **You'll see two options:**
   - **Option A: Use Supabase Default** (Quickest - for testing)
     - Just toggle Google ON
     - No credentials needed
     - Uses Supabase's shared OAuth credentials
     - Works for development/testing
   
   - **Option B: Use Your Own Credentials** (For production)
     - See next steps for Google Cloud Console setup

## Step 2: For Production (Optional - Skip for Now)

If you want to use your own Google OAuth credentials:

1. **Google Cloud Console Setup**
   - Go to: https://console.cloud.google.com/
   - Create/select a project
   - **APIs & Services** → **Credentials**
   - **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - **Authorized redirect URI**: `https://[your-project-ref].supabase.co/auth/v1/callback`
     - Find your project ref in Supabase → Settings → API → Project URL
   - Copy **Client ID** and **Client Secret**

2. **Add to Supabase**
   - Paste Client ID and Client Secret into Supabase → Authentication → Providers → Google
   - Click **Save**

## Step 3: Test

1. Refresh your app login page
2. Click **"Continue with Google"**
3. Should redirect to Google for sign-in!

## Quick Fix for Right Now

**Just enable Google provider with Supabase's default credentials:**
- Supabase Dashboard → Authentication → Providers → Google → Toggle ON
- No additional setup needed for testing!
- Click Save
- Try again immediately!

