// Direct Perplexity API integration using regular sonar model
export class PerplexityDirectService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async researchCompany(companyName: string, website?: string) {
    console.log('🚀 Starting Perplexity research...')
    console.log('Company:', companyName)
    console.log('Website:', website)

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content: this.buildResearchPrompt(companyName, website)
            }
          ],
          max_tokens: 2000,
          temperature: 0.2
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get research: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Research completed:', result)

      return {
        jobId: result.id,
        status: 'completed',
        message: 'Research completed successfully',
        content: result.choices[0].message.content,
        citations: result.citations || [],
        searchResults: result.search_results || [],
        usage: result.usage,
        model: result.model
      }
    } catch (error) {
      console.error('Failed to research company:', error)
      throw error
    }
  }

  private buildResearchPrompt(companyName: string, website?: string): string {
    let prompt = `Research the company "${companyName}"`
    
    if (website) {
      prompt += ` (website: ${website})`
    }
    
    prompt += ` and provide comprehensive information about:

1. **Company Overview**
   - Industry and business sector
   - Business model and company size
   - Unique value proposition
   - Brand tone and voice

2. **Target Audience**
   - Primary target customers
   - Customer pain points
   - Customer goals and objectives

3. **Market Analysis**
   - Current market trends
   - Market opportunities
   - Industry challenges

4. **Competitive Landscape**
   - Direct competitors
   - Competitive advantages
   - Market positioning

5. **SEO & Digital Presence**
   - Key SEO keywords
   - Content marketing keywords
   - Industry-related keywords
   - Social media platforms and strategy

6. **Website Analysis**
   - Domain and online presence
   - Key website features
   - Optimization opportunities

Format your response with clear sections and provide specific, actionable insights.`

    return prompt
  }

  // Extract structured data from the research content
  extractStructuredData(content: string) {
    return {
      fullReport: content,
      companyOverview: {
        industry: this.extractField(content, ['industry', 'sector', 'business sector']),
        businessType: this.extractField(content, ['business model', 'B2B', 'B2C', 'SaaS']),
        companySize: this.extractField(content, ['company size', 'startup', 'SMB', 'enterprise']),
        uniqueValueProp: this.extractField(content, ['value proposition', 'unique value', 'differentiation']),
        brandTone: this.extractField(content, ['brand tone', 'voice', 'tone of voice'])
      },
      targetAudience: {
        targetAudience: this.extractField(content, ['target audience', 'customers', 'target customers']),
        audiencePainPoints: this.extractArray(content, ['pain points', 'challenges', 'problems']),
        audienceGoals: this.extractArray(content, ['goals', 'objectives', 'needs'])
      },
      marketTrends: {
        marketTrends: this.extractArray(content, ['market trends', 'trends', 'industry trends']),
        opportunities: this.extractArray(content, ['opportunities', 'market opportunities']),
        challenges: this.extractArray(content, ['challenges', 'industry challenges'])
      },
      competitors: {
        competitors: this.extractArray(content, ['competitors', 'competitive landscape']),
        competitiveAdvantages: this.extractArray(content, ['competitive advantages', 'advantages']),
        marketPosition: this.extractField(content, ['market positioning', 'positioning'])
      },
      seoKeywords: {
        seoKeywords: this.extractArray(content, ['SEO keywords', 'keywords', 'search terms']),
        contentKeywords: this.extractArray(content, ['content keywords', 'content marketing']),
        industryKeywords: this.extractArray(content, ['industry keywords', 'industry terms'])
      },
      socialMedia: {
        platforms: this.extractArray(content, ['social media', 'platforms', 'LinkedIn', 'Twitter', 'Facebook']),
        engagement: this.extractField(content, ['engagement', 'social engagement']),
        strategy: this.extractField(content, ['social media strategy', 'strategy']),
        followers: this.extractField(content, ['followers', 'audience size'])
      },
      websiteAnalysis: {
        domain: this.extractField(content, ['domain', 'website', 'online presence']),
        description: this.extractField(content, ['website description', 'description']),
        keyFeatures: this.extractArray(content, ['key features', 'features', 'website features']),
        optimization: this.extractField(content, ['optimization', 'SEO optimization'])
      }
    }
  }

  private extractField(text: string, keywords: string[]): string {
    const sentences = text.split(/[.!?]+/)
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()
      if (keywords.some(keyword => lowerSentence.includes(keyword.toLowerCase()))) {
        return sentence.trim().substring(0, 200)
      }
    }
    
    return "Not specified"
  }

  private extractArray(text: string, keywords: string[]): string[] {
    const sentences = text.split(/[.!?]+/)
    const items: string[] = []
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()
      if (keywords.some(keyword => lowerSentence.includes(keyword.toLowerCase()))) {
        // Try to extract list items
        const listMatch = sentence.match(/(?:•|[-*]|\d+\.)\s*([^.!?]+)/g)
        if (listMatch) {
          items.push(...listMatch.map(item => item.replace(/^[•-*\d.\s]+/, '').trim()).filter(item => item.length > 2))
        } else {
          // If no list format, try to split by common delimiters
          const parts = sentence.split(/[,;|]/).map(part => part.trim()).filter(part => part.length > 2)
          items.push(...parts)
        }
      }
    }
    
    return items.slice(0, 5) // Limit to 5 items
  }
}

// Export singleton instance
export const perplexityDirect = new PerplexityDirectService(process.env.PERPLEXITY_API_KEY!)





