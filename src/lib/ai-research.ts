import { openRouter } from './openrouter'

export interface CompanyResearch {
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
}

export class AIResearchService {
  async researchCompany(companyName: string): Promise<CompanyResearch> {
    const systemPrompt = `You are an expert business researcher and marketing strategist. 
    Research the company "${companyName}" and provide comprehensive business intelligence.

    Return ONLY a valid JSON object with this exact structure:
    {
      "industry": "string",
      "businessType": "string", 
      "companySize": "string",
      "targetAudience": "string",
      "audiencePainPoints": ["string1", "string2", "string3"],
      "audienceGoals": ["string1", "string2", "string3"],
      "keyServices": ["string1", "string2", "string3"],
      "uniqueValueProp": "string",
      "seoKeywords": ["string1", "string2", "string3"],
      "competitors": ["string1", "string2", "string3"],
      "brandTone": "string",
      "contentGoals": ["string1", "string2", "string3"]
    }

    Research guidelines:
    - Use current, accurate information about the company
    - Industry should be specific (e.g., "Technology", "Healthcare", "Finance")
    - BusinessType should be one of: "B2B", "B2C", "SaaS", "E-commerce", "Service-based", "Agency", "Non-profit"
    - CompanySize should be one of: "1-10 employees", "11-50 employees", "51-200 employees", "201-1000 employees", "1000+ employees"
    - TargetAudience should be specific and detailed
    - PainPoints should be common challenges their customers face
    - Goals should be what their customers want to achieve
    - KeyServices should be their main products/services
    - UniqueValueProp should be what makes them different
    - SEOKeywords should be relevant search terms for their industry
    - Competitors should be direct competitors
    - BrandTone should be one of: "professional", "casual", "authoritative", "conversational", "friendly", "technical", "creative", "formal"
    - ContentGoals should be marketing objectives like: "Brand Awareness", "Lead Generation", "Thought Leadership", "Customer Education", "Product Promotion", "Community Building"

    If you cannot find specific information, make educated inferences based on the company name and industry.`

    const userPrompt = `Research the company: ${companyName}

    Provide comprehensive business intelligence including industry, target audience, services, competitors, and marketing insights.`

    try {
      const response = await openRouter.generateContent({
        model: 'openai/gpt-4o-mini', // Cost-effective model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3 // Lower temperature for more consistent, factual responses
      })

      const content = response.choices[0].message.content
      
      // Try to parse the JSON response
      try {
        const research = JSON.parse(content)
        return this.validateResearch(research)
      } catch (parseError) {
        console.error('Failed to parse AI research response:', parseError)
        console.log('Raw response:', content)
        
        // Fallback: try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const research = JSON.parse(jsonMatch[0])
          return this.validateResearch(research)
        }
        
        throw new Error('Failed to parse AI research response')
      }
    } catch (error) {
      console.error('AI research error:', error)
      throw new Error('Failed to research company. Please try again.')
    }
  }

  private validateResearch(research: any): CompanyResearch {
    // Ensure all required fields exist with fallbacks
    return {
      industry: research.industry || 'Technology',
      businessType: research.businessType || 'B2B',
      companySize: research.companySize || '11-50 employees',
      targetAudience: research.targetAudience || 'Business professionals',
      audiencePainPoints: Array.isArray(research.audiencePainPoints) ? research.audiencePainPoints : ['Efficiency', 'Cost reduction', 'Growth'],
      audienceGoals: Array.isArray(research.audienceGoals) ? research.audienceGoals : ['Increase productivity', 'Reduce costs', 'Scale business'],
      keyServices: Array.isArray(research.keyServices) ? research.keyServices : ['Consulting', 'Software solutions', 'Support'],
      uniqueValueProp: research.uniqueValueProp || 'Innovative solutions for modern businesses',
      seoKeywords: Array.isArray(research.seoKeywords) ? research.seoKeywords : ['business solutions', 'technology', 'innovation'],
      competitors: Array.isArray(research.competitors) ? research.competitors : ['Competitor A', 'Competitor B'],
      brandTone: research.brandTone || 'professional',
      contentGoals: Array.isArray(research.contentGoals) ? research.contentGoals : ['Brand Awareness', 'Lead Generation']
    }
  }

  async researchIndustryTrends(industry: string): Promise<string[]> {
    const systemPrompt = `You are an expert industry analyst. Research current trends and topics in the ${industry} industry.

    Return ONLY a JSON array of 5 trending topics as strings:
    ["topic1", "topic2", "topic3", "topic4", "topic5"]

    Focus on:
    - Current industry trends
    - Emerging technologies
    - Market developments
    - Regulatory changes
    - Consumer behavior shifts

    Make topics specific and actionable for content creation.`

    const userPrompt = `Research current trends in the ${industry} industry for content marketing purposes.`

    try {
      const response = await openRouter.generateContent({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })

      const content = response.choices[0].message.content
      const trends = JSON.parse(content)
      
      return Array.isArray(trends) ? trends : [
        `${industry} industry trends`,
        `Digital transformation in ${industry}`,
        `Future of ${industry}`,
        `${industry} best practices`,
        `Emerging ${industry} technologies`
      ]
    } catch (error) {
      console.error('Industry trends research error:', error)
      return [
        `${industry} industry trends`,
        `Digital transformation in ${industry}`,
        `Future of ${industry}`,
        `${industry} best practices`,
        `Emerging ${industry} technologies`
      ]
    }
  }
}

// Initialize AI research service
export const aiResearch = new AIResearchService()














