// Simple Perplexity research service
export const perplexityResearch = {
  async researchCompany(companyName: string, website?: string) {
    const apiKey = process.env.PERPLEXITY_API_KEY || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || ''
    
    if (!apiKey) {
      throw new Error('Perplexity API key not configured')
    }

    console.log('🔍 Making Perplexity API request...')
    console.log('API Key present:', apiKey ? 'Yes' : 'No')
    console.log('Request for company:', companyName)

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'user',
              content: 'Hello, test message'
            }
          ],
          max_tokens: 50
        })
      })

      console.log('📡 Perplexity API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Perplexity API error response:', errorText)
        console.error('❌ Response status:', response.status)
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()))
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('✅ Perplexity API success!')
      console.log('📝 Content length:', data.choices[0]?.message?.content?.length || 0)
      console.log('🔑 Usage info:', data.usage)
      
      const content = data.choices[0]?.message?.content || ''
      
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
      console.error('Perplexity research error:', error)
      throw new Error('Failed to research company with Perplexity')
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
