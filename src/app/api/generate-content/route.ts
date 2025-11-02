import { NextRequest, NextResponse } from 'next/server'
import { openRouter } from '@/lib/openrouter'

function createContentPrompt(topic: string, platform: string, tone: string, clientProfile: any, longFormContent?: string): string {
  const { name, industry, target_audience, brand_voice, competitors, goals } = clientProfile || {}
  
  let prompt = `Create ${platform} content about: ${topic}\n\n`
  
  // If long-form content is provided, use it as context for social posts
  if (longFormContent && platform !== 'blog') {
    prompt += `Based on this long-form content, create a ${platform} post that captures the key message:\n\n${longFormContent.substring(0, 2000)}\n\n`
  }
  
  if (name) prompt += `Client: ${name}\n`
  if (industry) prompt += `Industry: ${industry}\n`
  if (target_audience) prompt += `Target Audience: ${target_audience}\n`
  if (brand_voice) prompt += `Brand Voice: ${brand_voice}\n`
  if (competitors && competitors.length > 0) prompt += `Competitors: ${competitors.join(', ')}\n`
  if (goals && goals.length > 0) prompt += `Business Goals: ${goals.join(', ')}\n`
  
  prompt += `\nTone: ${tone}\n`
  prompt += `Platform: ${platform}\n\n`
  
  if (platform === 'twitter' || platform === 'x') {
    prompt += 'Create an X (formerly Twitter) post that is EXACTLY 250 characters or less (including spaces and hashtags). This is CRITICAL - the post must be concise, engaging, and stay under 250 characters. Count characters carefully and ensure the final post does not exceed this limit. Include 1-2 relevant hashtags if they fit within the limit.'
  } else if (platform === 'linkedin') {
    prompt += 'Create a LinkedIn post that is professional and thought-provoking, suitable for B2B audience.'
  } else if (platform === 'instagram') {
    prompt += 'Create an Instagram post with engaging copy and relevant hashtags.'
  } else if (platform === 'facebook') {
    prompt += 'Create a Facebook post that encourages engagement and community interaction.'
  } else if (platform === 'blog') {
    prompt += 'Create a comprehensive, long-form blog post (minimum 2500-3000 words, aim for 3000+ words) with:\n- A compelling headline\n- Well-structured sections with H2 and H3 headings\n- Detailed explanations and examples\n- Real-world use cases\n- Actionable insights and practical tips\n- Statistics and data where relevant\n- Multiple sub-sections within each main section\n- Conclusion with key takeaways\n- Clear formatting with markdown (use # for H1, ## for H2, ### for H3, ** for bold, - for lists)\n\nMake this a thorough, in-depth article that provides substantial value. Do not stop early - continue until you have written a full, comprehensive piece of at least 2500 words.'
  } else {
    prompt += `Create ${platform} content that is engaging and appropriate for the platform.`
  }
  
  return prompt
}

export async function POST(request: NextRequest) {
  try {
    const { topic, platform, tone, clientProfile, longFormContent } = await request.json()

    if (!topic?.trim()) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OpenRouter API key not found in environment variables')
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    console.log('OpenRouter API key found, length:', process.env.OPENROUTER_API_KEY.length)

    // Create the prompt based on the parameters
    const prompt = createContentPrompt(topic, platform, tone, clientProfile, longFormContent)
    
        // Get AI model from admin config
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: aiModelConfig } = await supabase
          .from('admin_configs')
          .select('value')
          .eq('key', 'ai_model')
          .single()

        const { data: maxTokensConfig } = await supabase
          .from('admin_configs')
          .select('value')
          .eq('key', 'ai_max_tokens')
          .single()

        const { data: temperatureConfig } = await supabase
          .from('admin_configs')
          .select('value')
          .eq('key', 'ai_temperature')
          .single()

        const { data: systemPromptConfig } = await supabase
          .from('admin_configs')
          .select('value')
          .eq('key', 'ai_system_prompt')
          .single()

        const model = aiModelConfig?.value || 'openai/gpt-4o-mini'
        
        // For blog posts, always use a higher token limit regardless of config
        // For other platforms, use config value or default
        let maxTokens: number
        if (platform === 'blog') {
          // Force higher tokens for long-form blog content
          maxTokens = 4000
        } else {
          maxTokens = parseInt(maxTokensConfig?.value || '1000')
        }
        
        const temperature = parseFloat(temperatureConfig?.value || '0.7')
        const systemPrompt = systemPromptConfig?.value || 'You are a professional content creator who generates high-quality, engaging content for various social media platforms and blogs.'

        const response = await openRouter.generateContent({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        })

    let content = response.choices[0]?.message?.content || 'Failed to generate content'
    
    // Clean up content (remove markdown, extra whitespace)
    content = content.trim()
    // Remove markdown code blocks if present
    if (content.startsWith('```')) {
      content = content.replace(/^```[\w]*\n?/g, '').replace(/\n?```$/g, '')
    }
    
    // For X/Twitter, enforce strict character limit and truncate if needed
    if (platform === 'twitter' || platform === 'x') {
      const MAX_X_CHARS = 250
      if (content.length > MAX_X_CHARS) {
        // Truncate and add ellipsis if needed, but try to preserve meaning
        content = content.substring(0, MAX_X_CHARS - 3).trim() + '...'
        console.warn(`X/Twitter post exceeded ${MAX_X_CHARS} characters, truncated to ${content.length}`)
      }
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
