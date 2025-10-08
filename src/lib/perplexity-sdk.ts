import { Perplexity } from '@perplexity-ai/perplexity_ai'

// Initialize Perplexity client
const perplexity = new Perplexity({
  apiKey: process.env.PERPLEXITY_API_KEY || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || ''
})

export const perplexityResearch = {
  async researchCompany(companyName: string, website?: string) {
    if (!perplexity.apiKey) {
      throw new Error('Perplexity API key not configured')
    }

    console.log('🔍 Making Perplexity API request using SDK...')
    console.log('API Key present:', perplexity.apiKey ? 'Yes' : 'No')
    console.log('Request for company:', companyName)

    try {
      console.log('🔍 Starting research - this may take 30-60 seconds...')
      
      const response = await perplexity.chat.completions.create({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'user',
            content: `Research the company "${companyName}" and provide comprehensive information about their industry, business model, target audience, key services, competitors, recent news, market trends, and SEO keywords. Format your response with clear sections for each topic.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      })

      console.log('✅ Perplexity API success using SDK!')
      console.log('📝 Content length:', response.choices[0]?.message?.content?.length || 0)
      console.log('🔑 Usage info:', response.usage)
      
      const content = response.choices[0]?.message?.content || ''
      
      // Simple data extraction
      return {
        industry: this.extractField(content, ['industry', 'sector', 'field']) || 'Technology',
        businessType: this.extractField(content, ['business model', 'type']) || 'B2B',
        companySize: this.extractField(content, ['company size', 'size', 'employees']) || 'Small Business',
        targetAudience: this.extractField(content, ['target audience', 'customers', 'clients']) || 'Business professionals',
        keyServices: this.extractArray(content, ['services', 'products', 'offerings']),
        competitors: this.extractArray(content, ['competitors', 'rivals']),
        seoKeywords: this.extractArray(content, ['keywords', 'SEO terms', 'search terms']),
        recentNews: this.extractArray(content, ['recent news', 'latest updates', 'announced']),
        marketTrends: this.extractArray(content, ['trends', 'market developments']),
        uniqueValueProp: this.extractField(content, ['unique value proposition', 'differentiator']) || 'Quality service and customer focus',
        brandTone: this.extractField(content, ['tone', 'voice', 'style']) || 'Professional',
        contentGoals: this.extractArray(content, ['content goals', 'marketing objectives']),
        audiencePainPoints: this.extractArray(content, ['challenges', 'pain points', 'problems']),
        audienceGoals: this.extractArray(content, ['goals', 'objectives']),
        socialMediaPresence: {
          platforms: this.extractArray(content, ['social media', 'platforms']),
          engagement: 'Medium',
          followers: 'Growing'
        },
        websiteAnalysis: {
          domain: website || 'Not provided',
          description: 'Professional business website',
          keyFeatures: ['Responsive design', 'Contact forms', 'Service information']
        }
      }
    } catch (error) {
      console.error('Perplexity SDK error:', error)
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
      
      // Re-throw the original error with more details
      const errorMessage = error instanceof Error ? error.message : 'Unknown Perplexity SDK error'
      throw new Error(`Perplexity SDK failed: ${errorMessage}`)
    }
  },

  extractField(text: string, patterns: string[]): string {
    for (const pattern of patterns) {
      const regex = new RegExp(`(?:${pattern})[:\s]+([^.]+)`, 'i')
      const match = text.match(regex)
      if (match) return match[1].trim()
    }
    return ''
  },

  extractArray(text: string, patterns: string[]): string[] {
    const results: string[] = []
    for (const pattern of patterns) {
      const regex = new RegExp(`(?:${pattern})[:\s]+([^.]+)`, 'gi')
      const matches = text.match(regex)
      if (matches) {
        results.push(...matches.map(m => m.replace(new RegExp(`^(?:${pattern})[:\s]+`, 'i'), '').trim()))
      }
    }
    return [...new Set(results)].slice(0, 5)
  }
}
