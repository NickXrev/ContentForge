# LinkedIn OAuth Setup Guide

## 1. Create LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click "Create App"
3. Fill in:
   - **App name**: ContentForge
   - **LinkedIn Page**: (optional)
   - **Privacy Policy URL**: `http://localhost:3000/privacy`
   - **App Logo**: (optional)

## 2. Configure OAuth Settings

1. Go to "Auth" tab in your LinkedIn app
2. Add these redirect URLs:
   - `http://localhost:3000/api/auth/linkedin/callback`
   - `https://yourdomain.com/api/auth/linkedin/callback` (for production)

3. Request these scopes:
   - `r_liteprofile` - Read basic profile info
   - `r_emailaddress` - Read email address  
   - `w_member_social` - Post content to LinkedIn

## 3. Get Credentials

1. Copy your **Client ID** and **Client Secret**
2. Add them to your `.env.local` file:

```env
# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here

# App Configuration  
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. Test the Integration

1. Start your dev server: `npm run dev`
2. Go to `/accounts`
3. Click "LinkedIn" button
4. You should be redirected to LinkedIn for authorization
5. After authorizing, you'll be redirected back with your account connected!

## 5. Production Setup

For production, update:
- Redirect URLs in LinkedIn app settings
- `NEXT_PUBLIC_APP_URL` to your production domain
- Add production redirect URL to LinkedIn app
