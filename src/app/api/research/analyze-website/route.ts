import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { openRouter } from '@/lib/openrouter'

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WebsiteAnalysisRequest {
  url: string
  companyName: string
  teamId: string
}

interface WebsiteData {
  title?: string
  description?: string
  metaKeywords?: string
  content?: string
  wordCount?: number
  language?: string
}

interface CompanyIntelligence {
  businessType?: string
  industry?: string
  targetAudience?: string
  valueProposition?: string
  keyServices?: string[]
  keyProducts?: string[]
  pricingInfo?: string
  contactInfo?: any
  socialMedia?: any
  companySize?: string
  foundedYear?: number
  location?: string
  toneOfVoice?: string
  brandStyle?: string
  keyMessages?: string[]
  competitiveAdvantages?: string[]
  painPointsAddressed?: string[]
  callToActions?: string[]
}

// Function to scrape website content (simplified version)
async function scrapeWebsite(url: string): Promise<WebsiteData> {
  try {
    // For now, we'll use a simple fetch approach
    // In production, you'd want to use a proper web scraping service
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    
    // Simple HTML parsing (in production, use a proper HTML parser)
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i)
    const keywordsMatch = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]*)"/i)
    
    // Extract text content (remove HTML tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    return {
      title: titleMatch?.[1] || '',
      description: descriptionMatch?.[1] || '',
      metaKeywords: keywordsMatch?.[1] || '',
      content: textContent.substring(0, 10000), // Limit content length
      wordCount: textContent.split(/\s+/).length,
      language: 'en' // Default to English
    }
  } catch (error) {
    console.error('Error scraping website:', error)
    throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Function to analyze company intelligence using AI
async function analyzeCompanyIntelligence(websiteData: WebsiteData, companyName: string): Promise<CompanyIntelligence> {
  try {
    const prompt = `
Analyze this website data and extract comprehensive company intelligence for "${companyName}".

Website Data:
- Title: ${websiteData.title}
- Description: ${websiteData.description}
- Keywords: ${websiteData.metaKeywords}
- Content: ${websiteData.content?.substring(0, 5000)}

Please extract and return a JSON object with the following structure:
{
  "businessType": "e.g., SaaS, E-commerce, Consulting, etc.",
  "industry": "e.g., Technology, Healthcare, Finance, etc.",
  "targetAudience": "description of their ideal customers",
  "valueProposition": "what makes them unique",
  "keyServices": ["service1", "service2", "service3"],
  "keyProducts": ["product1", "product2", "product3"],
  "pricingInfo": "any pricing information found",
  "contactInfo": {
    "email": "contact email if found",
    "phone": "phone number if found",
    "address": "address if found"
  },
  "socialMedia": {
    "facebook": "facebook URL if found",
    "twitter": "twitter URL if found",
    "linkedin": "linkedin URL if found",
    "instagram": "instagram URL if found"
  },
  "companySize": "e.g., Startup, Small Business, Enterprise",
  "foundedYear": 2020,
  "location": "city, country",
  "toneOfVoice": "e.g., Professional, Casual, Technical, Friendly",
  "brandStyle": "e.g., Modern, Traditional, Innovative, Conservative",
  "keyMessages": ["message1", "message2", "message3"],
  "competitiveAdvantages": ["advantage1", "advantage2", "advantage3"],
  "painPointsAddressed": ["pain1", "pain2", "pain3"],
  "callToActions": ["cta1", "cta2", "cta3"]
}

Return only the JSON object, no additional text.
`

    // Get research model from admin config
    const { data: researchModelConfig } = await supabase
      .from('admin_configs')
      .select('value')
      .eq('key', 'research_model')
      .single()

    const { data: maxTokensConfig } = await supabase
      .from('admin_configs')
      .select('value')
      .eq('key', 'research_max_tokens')
      .single()

    const { data: temperatureConfig } = await supabase
      .from('admin_configs')
      .select('value')
      .eq('key', 'research_temperature')
      .single()

    const model = researchModelConfig?.value || 'openai/gpt-4o-mini'
    const maxTokens = parseInt(maxTokensConfig?.value || '2000')
    const temperature = parseFloat(temperatureConfig?.value || '0.3')

    const response = await openRouter.generateContent({
      model: model,
      messages: [
        { role: 'system', content: 'You are a business intelligence analyst. Extract structured company data from website content and return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    })

    const content = response.choices[0]?.message?.content || '{}'
    return JSON.parse(content)
  } catch (error) {
    console.error('Error analyzing company intelligence:', error)
    return {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, companyName, teamId }: WebsiteAnalysisRequest = await request.json()

    if (!url || !companyName || !teamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Create research record (without client_profile_id since it doesn't exist)
    const { data: researchRecord, error: researchError } = await supabase
      .from('company_research')
      .insert({
        team_id: teamId,
        company_name: companyName,
        website_url: url,
        research_status: 'in_progress'
      })
      .select()
      .single()

    console.log('Research record creation result:', { researchRecord, researchError })

    if (researchError) {
      console.error('Error creating research record:', researchError)
      console.error('Error details:', {
        message: researchError.message,
        details: researchError.details,
        hint: researchError.hint,
        code: researchError.code
      })
      return NextResponse.json({ 
        error: 'Failed to create research record', 
        details: researchError.message 
      }, { status: 500 })
    }

    try {
      // Scrape website
      const websiteData = await scrapeWebsite(url)

      // Store website analysis
      const { error: analysisError } = await supabase
        .from('website_analysis')
        .insert({
          research_id: researchRecord.id,
          url: url,
          title: websiteData.title,
          description: websiteData.description,
          meta_keywords: websiteData.metaKeywords,
          content_summary: websiteData.content?.substring(0, 1000),
          extracted_text: websiteData.content,
          word_count: websiteData.wordCount,
          language: websiteData.language
        })

      if (analysisError) {
        console.error('Error storing website analysis:', analysisError)
      }

      // Analyze company intelligence
      const companyIntelligence = await analyzeCompanyIntelligence(websiteData, companyName)

      // Store company intelligence
      const { error: intelligenceError } = await supabase
        .from('company_intelligence')
        .insert({
          research_id: researchRecord.id,
          business_type: companyIntelligence.businessType,
          industry: companyIntelligence.industry,
          target_audience: companyIntelligence.targetAudience,
          value_proposition: companyIntelligence.valueProposition,
          key_services: companyIntelligence.keyServices,
          key_products: companyIntelligence.keyProducts,
          pricing_info: companyIntelligence.pricingInfo,
          contact_info: companyIntelligence.contactInfo,
          social_media: companyIntelligence.socialMedia,
          company_size: companyIntelligence.companySize,
          founded_year: companyIntelligence.foundedYear,
          location: companyIntelligence.location,
          tone_of_voice: companyIntelligence.toneOfVoice,
          brand_style: companyIntelligence.brandStyle,
          key_messages: companyIntelligence.keyMessages,
          competitive_advantages: companyIntelligence.competitiveAdvantages,
          pain_points_addressed: companyIntelligence.painPointsAddressed,
          call_to_actions: companyIntelligence.callToActions
        })

      if (intelligenceError) {
        console.error('Error storing company intelligence:', intelligenceError)
      }

      // Update research status to completed
      await supabase
        .from('company_research')
        .update({ research_status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', researchRecord.id)

      return NextResponse.json({
        success: true,
        researchId: researchRecord.id,
        message: 'Website analysis completed successfully'
      })

    } catch (error) {
      // Update research status to failed
      await supabase
        .from('company_research')
        .update({ research_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', researchRecord.id)

      console.error('Error during website analysis:', error)
      return NextResponse.json({ 
        error: 'Website analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in analyze-website API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
