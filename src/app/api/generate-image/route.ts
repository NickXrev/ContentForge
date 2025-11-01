import { NextRequest, NextResponse } from 'next/server'
import { openRouter } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const { prompt, platform } = await request.json()

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Create image prompt based on platform and content
    let imagePrompt = prompt
    
    // Add platform-specific styling hints
    if (platform === 'instagram') {
      imagePrompt = `Create a vibrant, engaging social media image for Instagram: ${prompt}. Style: modern, colorful, attention-grabbing, suitable for social media.`
    } else if (platform === 'twitter' || platform === 'x') {
      imagePrompt = `Create a clean, professional image for Twitter/X: ${prompt}. Style: minimal, clear, readable text if needed, professional.`
    } else if (platform === 'linkedin') {
      imagePrompt = `Create a professional business image for LinkedIn: ${prompt}. Style: professional, corporate, clean design, B2B appropriate.`
    }

    // Use OpenRouter's image generation models (DALL-E 3 or similar)
    // Check if OpenRouter supports image generation, otherwise use a direct DALL-E call
    try {
      // Try using OpenRouter with image generation model
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'ContentForge'
        },
        body: JSON.stringify({
          model: 'black-forest-labs/flux-pro', // High quality image generation model
          messages: [
            {
              role: 'user',
              content: imagePrompt
            }
          ]
        })
      })

      if (!response.ok) {
        // Fallback to DALL-E if OpenRouter doesn't support
        throw new Error('OpenRouter image generation not available, trying DALL-E')
      }

      const data = await response.json()
      
      // Check if response contains image data
      if (data.choices?.[0]?.message?.content) {
        // If it's a text response pointing to an image, extract it
        const imageUrl = data.choices[0].message.content
        return NextResponse.json({ imageUrl, provider: 'openrouter' })
      }

      throw new Error('No image URL in response')
    } catch (openRouterError) {
      // Fallback: Use OpenAI DALL-E directly if available
      if (process.env.OPENAI_API_KEY) {
        try {
          const dallEResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: imagePrompt,
              n: 1,
              size: platform === 'instagram' ? '1024x1024' : '1024x1024',
              quality: 'standard'
            })
          })

          if (!dallEResponse.ok) {
            const errorText = await dallEResponse.text()
            throw new Error(`DALL-E API error: ${errorText}`)
          }

          const dalleData = await dallEResponse.json()
          const imageUrl = dalleData.data[0]?.url
          
          if (!imageUrl) {
            throw new Error('No image URL in DALL-E response')
          }

          return NextResponse.json({ imageUrl, provider: 'dalle' })
        } catch (dalleError) {
          console.error('DALL-E error:', dalleError)
          return NextResponse.json(
            { 
              error: 'Image generation not available',
              details: dalleError instanceof Error ? dalleError.message : 'Unknown error'
            },
            { status: 500 }
          )
        }
      }

      return NextResponse.json(
        { 
          error: 'Image generation not configured',
          details: 'Neither OpenRouter image models nor OpenAI DALL-E API key is available'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

