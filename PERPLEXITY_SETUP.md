# Perplexity AI Setup Guide

## Getting Your API Key

1. **Visit Perplexity AI**: Go to [https://www.perplexity.ai/](https://www.perplexity.ai/)
2. **Sign Up/Login**: Create an account or log in to your existing account
3. **Access API**: Navigate to the API section in your account dashboard
4. **Generate Key**: Create a new API key for your project

## Environment Configuration

Add your Perplexity API key to your `.env.local` file:

```bash
# Server-side environment variable (recommended for security)
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Keep your existing variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

## What Perplexity Research Provides

The enhanced research system now gathers comprehensive data including:

### Company Overview
- Industry classification
- Business type (B2B, B2C, SaaS, etc.)
- Company size and structure
- Unique value proposition

### Target Audience Analysis
- Detailed audience description
- Pain points and challenges
- Goals and objectives
- Demographics and psychographics

### Business Intelligence
- Key services and offerings
- Competitor analysis
- Recent news and developments
- Market trends and opportunities

### Digital Presence
- Social media platforms and engagement
- Website analysis
- SEO keywords and search terms
- Content strategy insights

### Marketing Intelligence
- Brand tone and voice
- Content goals and objectives
- Industry-specific trends
- Competitive positioning

## Fallback System

If Perplexity is unavailable or the API key is missing, the system automatically falls back to OpenRouter for research, ensuring continuous functionality.

## Testing

After adding your API key:
1. Restart your development server
2. Go to Accounts & Settings
3. Click "Research Company" on any client profile
4. Check the console for research progress logs
5. Verify the "Powered by Perplexity" indicator appears

The research will now provide much more comprehensive and current data about your clients!