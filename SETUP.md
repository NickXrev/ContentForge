# ContentForge Setup Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Go to SQL Editor and run the contents of `supabase-schema.sql`
   - Copy your project URL and anon key

3. **Set up OpenRouter**
   - Sign up at [OpenRouter](https://openrouter.ai/)
   - Get your API key from the dashboard

4. **Set up Stripe** (optional for MVP)
   - Create a Stripe account
   - Get your publishable and secret keys

5. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your API keys and URLs.

6. **Run the development server**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenRouter (Required for AI features)
OPENROUTER_API_KEY=your_openrouter_api_key

# Stripe (Optional for MVP)
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

1. In your Supabase dashboard, go to the SQL Editor
2. Copy and paste the entire contents of `supabase-schema.sql`
3. Click "Run" to execute the schema
4. Verify that all tables and policies are created

## Testing the Setup

1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. You should see the login page
4. Try creating an account (you'll need to verify email in Supabase)

## Next Steps

Once the basic setup is working:

1. **Configure AI**: Set up your client profiles in the research questionnaire
2. **Create Content**: Use the AI content generator
3. **Invite Team**: Add team members for collaboration
4. **Schedule Posts**: Use the custom calendar interface

## Troubleshooting

### Common Issues

1. **Supabase connection errors**
   - Check your URL and keys in `.env.local`
   - Ensure RLS policies are enabled

2. **OpenRouter API errors**
   - Verify your API key is correct
   - Check your OpenRouter account balance

3. **Build errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript errors with `npm run lint`

### Getting Help

- Check the console for error messages
- Verify all environment variables are set
- Ensure Supabase database schema is properly installed

