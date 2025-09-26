// OpenRouter API integration for multi-LLM content generation
export interface OpenRouterRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  max_tokens?: number
  temperature?: number
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenRouterClient {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateContent(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    console.log('OpenRouter request:', JSON.stringify(request, null, 2))
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'ContentForge'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API error:', response.status, response.statusText, errorText)
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  // Content generation methods
  async generateSocialPost(
    platform: 'linkedin' | 'twitter' | 'instagram' | 'facebook',
    clientProfile: any,
    topic: string,
    tone: string = 'professional'
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(clientProfile, platform)
    const userPrompt = `Create a ${platform} post about: ${topic}. Tone: ${tone}`

    const response = await this.generateContent({
      model: 'openai/gpt-4o-mini', // Cost-effective model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    })

    return response.choices[0].message.content
  }

  async generateBlogPost(
    clientProfile: any,
    topic: string,
    length: 'short' | 'medium' | 'long' = 'medium'
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(clientProfile, 'blog')
    const userPrompt = `Create a ${length} blog post about: ${topic}`

    const response = await this.generateContent({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })

    return response.choices[0].message.content
  }

  private buildSystemPrompt(clientProfile: any, platform: string): string {
    return `You are an expert content creator for ${clientProfile.name}, a ${clientProfile.industry} company.

Client Profile:
- Industry: ${clientProfile.industry}
- Target Audience: ${clientProfile.target_audience}
- Brand Voice: ${clientProfile.brand_voice}
- Competitors: ${clientProfile.competitors?.join(', ') || 'Not specified'}
- Goals: ${clientProfile.goals?.join(', ') || 'Not specified'}

Platform: ${platform}

Create content that:
1. Aligns with the brand voice and industry
2. Resonates with the target audience
3. Differentiates from competitors
4. Supports the client's goals
5. Is optimized for the specific platform

Format the content appropriately for ${platform}.`
  }
}

// Initialize OpenRouter client
export const openRouter = new OpenRouterClient(process.env.OPENROUTER_API_KEY!)
