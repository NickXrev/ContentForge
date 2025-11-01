# Image Generation Setup Guide

The Content Studio includes AI-powered image generation for social media posts. Images are automatically generated based on your post content and can be included when scheduling posts.

## Configuration

Image generation supports **OpenRouter (Flux Pro)** as the primary method and **OpenAI DALL-E 3** as a fallback.

### Option 1: OpenRouter (Recommended)
If you already have `OPENROUTER_API_KEY` configured for text generation, image generation will automatically use it. No additional setup needed!

### Option 2: OpenAI DALL-E 3 (Fallback)
If OpenRouter image generation fails or you prefer DALL-E, configure OpenAI API key.

## Setup Instructions

### Using OpenRouter (Easiest - Already Configured!)

If you already have `OPENROUTER_API_KEY` set up, **you're all set!** The image generation will automatically use OpenRouter's Flux Pro model. Just make sure your OpenRouter account has credits.

**No additional API keys needed!** ✅

### Using OpenAI DALL-E 3 (Alternative/Fallback)

If you prefer DALL-E or want a fallback option:

#### Step 1: Get Your OpenAI API Key

1. **Visit OpenAI**: Go to [https://platform.openai.com/](https://platform.openai.com/)
2. **Sign Up/Login**: Create an account or log in
3. **Get API Key**: 
   - Navigate to API Keys section: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Give it a name (e.g., "ContentForge Image Generation")
   - Copy the key immediately (you won't be able to see it again)

#### Step 2: Add API Key to Environment Variables

**For Local Development:**
Add to your `.env.local` file:
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**For Production (Vercel):**
1. Go to Vercel → **Settings** → **Environment Variables**
2. Add `OPENAI_API_KEY` with your key
3. Apply to Production, Preview, Development
4. **Redeploy** your application

### Verify Setup

1. Restart your development server if running locally
2. Go to Content Studio
3. Generate some content and create social posts
4. Click "Generate Image" on any social post
5. The image should appear within 10-20 seconds

## How It Works

- **Automatic Prompt Creation**: Images are generated based on your social post content
- **Platform-Specific Styling**: 
  - **Instagram**: Vibrant, colorful, attention-grabbing
  - **Twitter/X**: Clean, minimal, professional
  - **LinkedIn**: Professional, corporate, B2B appropriate
- **Image Storage**: Images are stored as URLs and included in post metadata
- **Scheduling**: When you schedule a post with an image, the image URL is saved in the post metadata

## Pricing

### OpenRouter Flux Pro
- Check current pricing on [OpenRouter Models](https://openrouter.ai/models?q=flux)
- Generally more cost-effective than DALL-E
- You're already paying for OpenRouter, so no additional account needed!

### OpenAI DALL-E 3 (if used as fallback)
- **Standard Quality**: $0.040 per image (1024x1024)
- **HD Quality**: $0.080 per image (1024x1024)

Images are generated on-demand when you click "Generate Image", so you only pay for what you use.

## Troubleshooting

### Error: "Image generation not configured"
- **If using OpenRouter**: Make sure `OPENROUTER_API_KEY` is set and your account has credits
- **If using DALL-E**: Make sure `OPENAI_API_KEY` is set in your environment variables
- Restart your development server after adding keys
- Check that the API key is correct and active in your account

### Error: "DALL-E API error"
- Check your OpenAI account has credits/billing set up
- Verify the API key has permissions for DALL-E
- Check OpenAI's status page: https://status.openai.com/

### Images not appearing
- Check browser console for errors
- Verify the image URL is being saved correctly
- Ensure the image URL is accessible (DALL-E URLs expire after 1 hour - you may need to download and host them)

## Future Improvements

- Image hosting/storage for permanent URLs
- Custom image prompts
- Multiple image options per post
- Batch image generation

