'use client'

interface PerplexityResearchResult {
  industry: string
  businessType: string
  companySize: string
  targetAudience: string
  audiencePainPoints: string[]
  audienceGoals: string[]
  keyServices: string[]
  uniqueValueProp: string
  seoKeywords: string[]
  competitors: string[]
  brandTone: string
  contentGoals: string[]
  recentNews: string[]
  marketTrends: string[]
  socialMediaPresence: {
    platforms: string[]
    engagement: string
    followers: string
  }
  websiteAnalysis: {
    domain: string
    description: string
    keyFeatures: string[]
  }
}

export class PerplexityResearchService {
  private apiKey: string

  constructor() {
    // Use server-side environment variable for API key
    this.apiKey = process.env.PERPLEXITY_API_KEY || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || ''
    if (!this.apiKey) {
      console.warn('Perplexity API key not configured. Research will fall back to OpenRouter.')
    }
  }

  async researchCompany(companyName: string, website?: string): Promise<PerplexityResearchResult> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured')
    }

    const researchPrompts = [
      `Research the company "${companyName}" and provide comprehensive current information about their industry, business model, target audience, key services, and unique value proposition. Include recent news, press releases, and company updates from 2024-2025.`,
      `Find and analyze the main competitors of "${companyName}" including their market positioning, strengths, weaknesses, and recent developments. Include both direct and indirect competitors.`,
      `Analyze the social media presence and digital marketing strategy of "${companyName}". What platforms do they use, what's their engagement like, and what's their content strategy?`,
      `Research the latest trends, challenges, and opportunities in the industry that "${companyName}" operates in. What are the current market dynamics and future outlook?`,
      `Find current SEO keywords, search terms, and content topics that "${companyName}" should focus on for 2025. What are people searching for in their industry?`,
      `Research the company size, funding, recent partnerships, acquisitions, or major business developments for "${companyName}". What's their current business status?`
    ]

    try {
      console.log(`Starting comprehensive Perplexity research for ${companyName}...`)
      
      // Make multiple research calls for comprehensive data
      const researchResults = await Promise.all(
        researchPrompts.map((prompt, index) => {
          console.log(`Making research call ${index + 1}/${researchPrompts.length}...`)
          return this.makePerplexityRequest(prompt)
        })
      )

      console.log('All Perplexity research calls completed, structuring results...')
      
      // Combine and structure the results
      const structuredResults = this.structureResearchResults(companyName, researchResults, website)
      
      console.log('Structured research results:', structuredResults)
      
      return structuredResults
    } catch (error) {
      console.error('Perplexity research error:', error)
      throw new Error('Failed to research company with Perplexity')
    }
  }

  private async makePerplexityRequest(prompt: string): Promise<string> {
    console.log('🔍 Making Perplexity API request...')
    console.log('API Key present:', this.apiKey ? 'Yes' : 'No')
    console.log('API Key length:', this.apiKey?.length || 0)
    console.log('Request prompt:', prompt.substring(0, 100) + '...')
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a business research assistant. Provide accurate, current information based on real-time data. Be specific and detailed in your analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.2
      })
    })

    console.log('📡 Perplexity API response status:', response.status)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Perplexity API error response:', errorText)
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ Perplexity API success!')
    console.log('📊 Response data keys:', Object.keys(data))
    console.log('📝 Content length:', data.choices[0]?.message?.content?.length || 0)
    console.log('🔑 Usage info:', data.usage)
    
    return data.choices[0]?.message?.content || ''
  }

  private structureResearchResults(companyName: string, results: string[], website?: string): PerplexityResearchResult {
    // Parse and structure the research results
    const combinedText = results.join('\n\n')
    
    console.log('Combined research text length:', combinedText.length)
    console.log('First 500 chars:', combinedText.substring(0, 500))
    
    // Extract structured information using improved pattern matching
    const structured = {
      industry: this.extractIndustry(combinedText),
      businessType: this.extractBusinessType(combinedText),
      companySize: this.extractCompanySize(combinedText),
      targetAudience: this.extractTargetAudience(combinedText),
      audiencePainPoints: this.extractPainPoints(combinedText),
      audienceGoals: this.extractGoals(combinedText),
      keyServices: this.extractServices(combinedText),
      uniqueValueProp: this.extractValueProp(combinedText),
      seoKeywords: this.extractKeywords(combinedText),
      competitors: this.extractCompetitors(combinedText),
      brandTone: this.extractBrandTone(combinedText),
      contentGoals: this.extractContentGoals(combinedText),
      recentNews: this.extractRecentNews(combinedText),
      marketTrends: this.extractMarketTrends(combinedText),
      socialMediaPresence: this.extractSocialMedia(combinedText),
      websiteAnalysis: this.extractWebsiteAnalysis(combinedText, website)
    }
    
    console.log('Extracted structured data:', structured)
    
    return structured
  }

  // Helper methods to extract specific information
  private extractIndustry(text: string): string {
    const patterns = [
      /(?:industry|sector|field|operates in)[:\s]+([^.]+)/i,
      /in the ([^.]+) industry/i,
      /([^.]+) sector/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1].trim()
    }
    return 'Technology'
  }

  private extractBusinessType(text: string): string {
    const patterns = [
      /\b(B2B|B2C|SaaS|E-commerce|Service-based|Agency|Non-profit|Consulting|Manufacturing)\b/i,
      /(?:business model|type)[:\s]+([^.]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }
    return 'B2B'
  }

  private extractCompanySize(text: string): string {
    const patterns = [
      /(\d+[-+]?\s*employees?)/i,
      /(startup|small business|enterprise|large company|mid-size)/i,
      /(?:company size|size)[:\s]+([^.]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }
    return 'Small Business'
  }

  private extractTargetAudience(text: string): string {
    const patterns = [
      /(?:target audience|customers|clients|serves)[:\s]+([^.]+)/i,
      /(?:focuses on|caters to)[:\s]+([^.]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1].trim()
    }
    return 'Business professionals'
  }

  private extractPainPoints(text: string): string[] {
    const patterns = [
      /(?:challenges?|pain points?|problems?)[:\s]+([^.]+)/gi,
      /(?:struggles?|difficulties)[:\s]+([^.]+)/gi,
      /(?:issues|concerns)[:\s]+([^.]+)/gi
    ]
    
    const results: string[] = []
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        results.push(...matches.map(m => m.replace(/^(?:challenges?|pain points?|problems?|struggles?|difficulties|issues|concerns)[:\s]+/i, '').trim()))
      }
    }
    return results.slice(0, 5) // Limit to 5 items
  }

  private extractGoals(text: string): string[] {
    const patterns = [
      /(?:goals?|objectives?)[:\s]+([^.]+)/gi,
      /(?:aims to|seeks to)[:\s]+([^.]+)/gi,
      /(?:wants to|desires to)[:\s]+([^.]+)/gi
    ]
    
    const results: string[] = []
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        results.push(...matches.map(m => m.replace(/^(?:goals?|objectives?|aims to|seeks to|wants to|desires to)[:\s]+/i, '').trim()))
      }
    }
    return results.slice(0, 5)
  }

  private extractServices(text: string): string[] {
    const patterns = [
      /(?:services?|products?|offerings?)[:\s]+([^.]+)/gi,
      /(?:provides?|offers?)[:\s]+([^.]+)/gi,
      /(?:specializes in|focuses on)[:\s]+([^.]+)/gi
    ]
    
    const results: string[] = []
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        results.push(...matches.map(m => m.replace(/^(?:services?|products?|offerings?|provides?|offers?|specializes in|focuses on)[:\s]+/i, '').trim()))
      }
    }
    return results.slice(0, 6)
  }

  private extractValueProp(text: string): string {
    const patterns = [
      /(?:unique value proposition|differentiator|competitive advantage)[:\s]+([^.]+)/i,
      /(?:what makes them unique|key differentiator)[:\s]+([^.]+)/i,
      /(?:stands out|distinguishes)[:\s]+([^.]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1].trim()
    }
    return 'Quality service and customer focus'
  }

  private extractKeywords(text: string): string[] {
    const patterns = [
      /(?:keywords?|SEO terms?|search terms?)[:\s]+([^.]+)/gi,
      /(?:relevant terms?|important terms?)[:\s]+([^.]+)/gi,
      /(?:focus keywords?|target keywords?)[:\s]+([^.]+)/gi
    ]
    
    const results: string[] = []
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        results.push(...matches.map(m => m.replace(/^(?:keywords?|SEO terms?|search terms?|relevant terms?|important terms?|focus keywords?|target keywords?)[:\s]+/i, '').trim()))
      }
    }
    return results.slice(0, 8)
  }

  private extractCompetitors(text: string): string[] {
    const patterns = [
      /(?:competitors?|rivals?)[:\s]+([^.]+)/gi,
      /(?:competes with|competition includes)[:\s]+([^.]+)/gi,
      /(?:similar companies|alternatives)[:\s]+([^.]+)/gi
    ]
    
    const results: string[] = []
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        results.push(...matches.map(m => m.replace(/^(?:competitors?|rivals?|competes with|competition includes|similar companies|alternatives)[:\s]+/i, '').trim()))
      }
    }
    return results.slice(0, 6)
  }

  private extractBrandTone(text: string): string {
    const patterns = [
      /(?:tone|voice|style)[:\s]+([^.]+)/i,
      /(?:brand personality|communication style)[:\s]+([^.]+)/i,
      /(?:approach|manner)[:\s]+([^.]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1].trim()
    }
    return 'Professional'
  }

  private extractContentGoals(text: string): string[] {
    const patterns = [
      /(?:content goals?|marketing objectives?)[:\s]+([^.]+)/gi,
      /(?:content strategy|marketing focus)[:\s]+([^.]+)/gi,
      /(?:aims to|seeks to)[:\s]+([^.]+)/gi
    ]
    
    const results: string[] = []
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        results.push(...matches.map(m => m.replace(/^(?:content goals?|marketing objectives?|content strategy|marketing focus|aims to|seeks to)[:\s]+/i, '').trim()))
      }
    }
    return results.slice(0, 5)
  }

  private extractRecentNews(text: string): string[] {
    const patterns = [
      /(?:recent news|latest updates?|recent developments?)[:\s]+([^.]+)/gi,
      /(?:announced|released|launched)[:\s]+([^.]+)/gi,
      /(?:in 2024|in 2025)[:\s]+([^.]+)/gi
    ]
    
    const results: string[] = []
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        results.push(...matches.map(m => m.replace(/^(?:recent news|latest updates?|recent developments?|announced|released|launched|in 2024|in 2025)[:\s]+/i, '').trim()))
      }
    }
    return results.slice(0, 4)
  }

  private extractMarketTrends(text: string): string[] {
    const patterns = [
      /(?:trends?|market developments?)[:\s]+([^.]+)/gi,
      /(?:industry trends?|market trends?)[:\s]+([^.]+)/gi,
      /(?:emerging|growing)[:\s]+([^.]+)/gi
    ]
    
    const results: string[] = []
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        results.push(...matches.map(m => m.replace(/^(?:trends?|market developments?|industry trends?|market trends?|emerging|growing)[:\s]+/i, '').trim()))
      }
    }
    return results.slice(0, 4)
  }

  private extractSocialMedia(text: string): { platforms: string[]; engagement: string; followers: string } {
    const platformPatterns = [
      /(?:social media|platforms?)[:\s]+([^.]+)/gi,
      /(?:active on|uses)[:\s]+([^.]+)/gi,
      /(?:LinkedIn|Twitter|Facebook|Instagram|YouTube|TikTok)/gi
    ]
    
    const platforms: string[] = []
    for (const pattern of platformPatterns) {
      const matches = text.match(pattern)
      if (matches) {
        platforms.push(...matches.map(m => m.replace(/^(?:social media|platforms?|active on|uses)[:\s]+/i, '').trim()))
      }
    }
    
    const engagementMatch = text.match(/(?:engagement|activity)[:\s]+([^.]+)/i)
    const followersMatch = text.match(/(?:followers?|audience)[:\s]+([^.]+)/i)
    
    return {
      platforms: [...new Set(platforms)].slice(0, 5),
      engagement: engagementMatch ? engagementMatch[1].trim() : 'Medium',
      followers: followersMatch ? followersMatch[1].trim() : 'Growing'
    }
  }

  private extractWebsiteAnalysis(text: string, website?: string): { domain: string; description: string; keyFeatures: string[] } {
    const domainMatch = text.match(/(?:website|domain)[:\s]+([^\s]+)/i)
    const descriptionMatch = text.match(/(?:website|site)[:\s]+([^.]+)/i)
    
    return {
      domain: domainMatch ? domainMatch[1] : (website || 'Not provided'),
      description: descriptionMatch ? descriptionMatch[1].trim() : 'Professional business website',
      keyFeatures: ['Responsive design', 'Contact forms', 'Service information']
    }
  }
}

export default new PerplexityResearchService()
