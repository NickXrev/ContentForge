import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, platform } = await request.json()

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
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

    // Try OpenRouter first (if API key is available)
    if (process.env.OPENROUTER_API_KEY) {
      try {
        // Try openai/gpt-5-image first, then fallback to flux-pro
        const modelsToTry = ['openai/gpt-5-image', 'black-forest-labs/flux-pro']
        
        for (const model of modelsToTry) {
          const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
              'X-Title': 'ContentForge'
            },
          body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: 'user',
                  content: imagePrompt
                }
              ],
              modalities: ['image'] // Specify we want image output
            })
          })

          if (openRouterResponse.ok) {
            const data = await openRouterResponse.json()
            
            // Check for image in response - could be in different formats
            if (data.choices?.[0]?.message?.content) {
              const content = data.choices[0].message.content
              
              // If content is an object with image URL
              if (typeof content === 'object' && content.url) {
                return NextResponse.json({ imageUrl: content.url, provider: `openrouter-${model}` })
              }
              
              // If content is a string URL
              if (typeof content === 'string' && (content.startsWith('http') || content.startsWith('data:'))) {
                return NextResponse.json({ imageUrl: content, provider: `openrouter-${model}` })
              }
              
              // Check for image in attachments or other fields
              if (data.choices?.[0]?.message?.image_url) {
                return NextResponse.json({ imageUrl: data.choices[0].message.image_url, provider: `openrouter-${model}` })
              }
            }
          } else if (openRouterResponse.status === 404 || openRouterResponse.status === 400) {
            // Model not found, try next model
            console.log(`Model ${model} not available, trying next...`)
            continue
          }
        }
        
        // If all OpenRouter models failed, try DALL-E fallback
        console.log('OpenRouter image generation not available, trying DALL-E fallback')
      } catch (openRouterError) {
        console.log('OpenRouter image generation failed, trying DALL-E fallback:', openRouterError)
      }
    }

    // Fallback to OpenAI DALL-E 3 if OpenRouter fails or isn't configured
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
            size: '1024x1024',
            quality: 'standard'
          })
        })

        if (!dallEResponse.ok) {
          const errorText = await dallEResponse.text()
          console.error('DALL-E API error:', dallEResponse.status, errorText)
          throw new Error(`DALL-E API error: ${errorText}`)
        }

        const dalleData = await dallEResponse.json()
        const imageUrl = dalleData.data[0]?.url
        
        if (!imageUrl) {
          throw new Error('No image URL in DALL-E response')
        }

        return NextResponse.json({ imageUrl, provider: 'dalle-3' })
      } catch (dalleError) {
        console.error('DALL-E error:', dalleError)
        return NextResponse.json(
          { 
            error: 'Image generation failed',
            details: dalleError instanceof Error ? dalleError.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

    // No image generation API available
    return NextResponse.json(
      { 
        error: 'Image generation not configured',
        details: 'Either OPENROUTER_API_KEY or OPENAI_API_KEY is required. See IMAGE_GENERATION_SETUP.md for setup instructions.'
      },
      { status: 500 }
    )
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

