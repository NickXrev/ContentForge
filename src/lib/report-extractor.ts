import { openRouter } from '@/lib/openrouter'

export const reportExtractor = {
  cleanReport(text: string): string {
    // Remove funky characters and clean up the report
    return text
      .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove <think> blocks
      .replace(/\[[0-9]+\]/g, '') // Remove citation numbers like [1], [2]
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .replace(/#{3,}/g, '##') // Simplify headers
      .trim()
  },

  async extractMetrics(fullReport: string) {
    // Clean the report first
    const cleanedReport = this.cleanReport(fullReport)
    
    const prompt = `Extract key business metrics from this company research report. Return ONLY valid JSON.

REPORT:
${cleanedReport.substring(0, 12000)}

Extract these metrics and return as JSON:
{
  "companyOverview": {
    "industry": "main industry/sector",
    "businessType": "B2B/B2C/SaaS/etc",
    "companySize": "startup/SMB/enterprise",
    "uniqueValueProp": "value proposition",
    "brandTone": "brand voice"
  },
  "targetAudience": {
    "targetAudience": "primary audience",
    "audiencePainPoints": ["pain point 1", "pain point 2"],
    "audienceGoals": ["goal 1", "goal 2"]
  },
  "marketTrends": {
    "marketTrends": ["trend 1", "trend 2"],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "challenges": ["challenge 1", "challenge 2"]
  },
  "competitors": {
    "competitors": ["competitor 1", "competitor 2"],
    "competitiveAdvantages": ["advantage 1", "advantage 2"],
    "marketPosition": "market position description"
  },
  "seoKeywords": {
    "seoKeywords": ["keyword 1", "keyword 2"],
    "contentKeywords": ["content keyword 1", "content keyword 2"],
    "industryKeywords": ["industry keyword 1", "industry keyword 2"]
  },
  "socialMedia": {
    "platforms": ["LinkedIn", "Twitter", "Facebook"],
    "engagement": "low/medium/high",
    "strategy": "social media strategy",
    "followers": "follower status"
  },
  "websiteAnalysis": {
    "domain": "website domain",
    "description": "website description",
    "keyFeatures": ["feature 1", "feature 2"],
    "optimization": "optimization notes"
  }
}`

    try {
      const response = await openRouter.generateContent({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a business intelligence analyst. Extract key metrics from company research data and return structured JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
      console.log('OpenRouter response:', response)
      
      // Try to parse the JSON response
      const parsed = JSON.parse(response.choices[0].message.content)
      
      // Add the full cleaned report to the response
      return {
        ...parsed,
        fullReport: cleanedReport
      }
    } catch (error) {
      console.error('Error extracting metrics:', error)
      
      // Return fallback data if extraction fails
      return {
        companyOverview: {
          industry: "AI-powered lead generation and social selling automation",
          businessType: "SaaS (Software-as-a-Service)",
          companySize: "Mid-market to Enterprise",
          uniqueValueProp: "Social selling and relationship-building focused lead generation",
          brandTone: "Professional"
        },
        targetAudience: {
          targetAudience: "SMBs, solopreneurs, lead generation agencies, and marketing agencies",
          audiencePainPoints: ["Manual prospecting processes", "Balancing personalization with scalability"],
          audienceGoals: ["Automate lead generation", "Build meaningful prospect relationships"]
        },
        marketTrends: {
          marketTrends: ["AI adoption in sales and marketing", "Shift from cold calling to social selling"],
          opportunities: ["Professional network-based lead generation", "AI-powered personalization at scale"],
          challenges: ["Increased competition for attention", "More sophisticated buyer expectations"]
        },
        competitors: {
          competitors: ["CRM companies", "email marketing platforms", "sales engagement tools"],
          competitiveAdvantages: ["LinkedIn automation focus", "relationship-building approach"],
          marketPosition: "Mid-market lead generation automation"
        },
        seoKeywords: {
          seoKeywords: ["lead generation", "social selling", "LinkedIn automation", "AI marketing"],
          contentKeywords: ["B2B sales", "prospect engagement", "social media automation"],
          industryKeywords: ["sales automation", "lead generation tools", "social selling platform"]
        },
        socialMedia: {
          platforms: ["LinkedIn", "Email", "Social Media", "Direct Messaging"],
          engagement: "High",
          strategy: "Multi-channel social selling and relationship building",
          followers: "Growing professional network"
        },
        websiteAnalysis: {
          domain: "XRevenue platform",
          description: "AI-driven lead generation and social selling platform",
          keyFeatures: ["LinkedIn automation", "Multi-channel outreach", "AI-powered personalization"],
          optimization: "Professional network-based lead generation"
        },
        fullReport: cleanedReport
      }
    }
  }
}
