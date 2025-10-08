import { NextRequest, NextResponse } from 'next/server'
import { perplexityAsyncResearch } from '@/lib/perplexity-async'
import { reportExtractor } from '@/lib/report-extractor'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const jobId = 'b145f023-80b1-427a-b0ce-500eaa107eab'
  
  try {
    console.log('🔄 Reprocessing job ID:', jobId)
    
    // Get the raw job response
    const jobStatus = await perplexityAsyncResearch.checkJobStatus(jobId)
    
    if (jobStatus.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Job not completed' }, { status: 400 })
    }

    // Reprocess with new extraction methods
    const content = jobStatus.response || ''
    const reprocessedData = {
      jobId: jobId,
      industry: perplexityAsyncResearch.extractField(content, ['Industry Overview', 'industry', 'sector']) || 'Technology',
      businessType: perplexityAsyncResearch.extractField(content, ['Business Model', 'business model', 'revenue model']) || 'B2B',
      companySize: perplexityAsyncResearch.extractField(content, ['company size', 'size', 'employees']) || 'Small Business',
      targetAudience: perplexityAsyncResearch.extractField(content, ['Target Audience', 'target audience', 'customer segmentation']) || 'Business professionals',
      keyServices: perplexityAsyncResearch.extractArray(content, ['Key Services', 'services', 'products', 'offerings']),
      competitors: perplexityAsyncResearch.extractArray(content, ['Competitive Landscape', 'competitors', 'rivals']),
      seoKeywords: perplexityAsyncResearch.extractArray(content, ['SEO', 'keywords', 'SEO terms', 'search terms']),
      recentNews: perplexityAsyncResearch.extractArray(content, ['Recent Developments', 'recent news', 'latest updates']),
      marketTrends: perplexityAsyncResearch.extractArray(content, ['Market Trends', 'trends', 'market developments']),
      uniqueValueProp: perplexityAsyncResearch.extractField(content, ['unique value proposition', 'differentiator', 'positioning']) || 'Quality service and customer focus',
      brandTone: perplexityAsyncResearch.extractField(content, ['tone', 'voice', 'style']) || 'Professional',
      contentGoals: perplexityAsyncResearch.extractArray(content, ['content goals', 'marketing objectives']),
      audiencePainPoints: perplexityAsyncResearch.extractArray(content, ['challenges', 'pain points', 'problems']),
      audienceGoals: perplexityAsyncResearch.extractArray(content, ['goals', 'objectives']),
      socialMediaPresence: {
        platforms: perplexityAsyncResearch.extractArray(content, ['social media', 'platforms', 'LinkedIn']),
        engagement: 'Medium',
        followers: 'Growing'
      },
      websiteAnalysis: {
        domain: 'Not provided',
        description: 'Professional business website',
        keyFeatures: ['Responsive design', 'Contact forms', 'Service information']
      },
      fullReport: content,
      reportSections: perplexityAsyncResearch.extractReportSections(content),
      citations: perplexityAsyncResearch.extractCitations(content),
      jobStatus: 'completed',
      completedAt: new Date().toISOString()
    }

    // Update the database with reprocessed data
    const { error } = await supabase
      .from('research_data')
      .update({
        research_data: reprocessedData,
        updated_at: new Date().toISOString()
      })
      .eq('research_data->>jobId', jobId)

    if (error) {
      console.error('Error updating research data:', error)
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 })
    }

    console.log('✅ Research data reprocessed and updated!')
    
    return NextResponse.json({
      success: true,
      jobId,
      reprocessedData
    })
    
  } catch (error) {
    console.error('Error reprocessing research:', error)
    return NextResponse.json({ 
      error: 'Failed to reprocess research',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    console.log('🔄 Reprocessing job ID:', jobId)
    
    // Get the raw job response
    const jobStatus = await perplexityAsyncResearch.checkJobStatus(jobId)
    
    if (jobStatus.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Job not completed' }, { status: 400 })
    }

    // Reprocess with new extraction methods
    const content = jobStatus.response || ''
    const reprocessedData = {
      jobId: jobId,
      industry: perplexityAsyncResearch.extractField(content, ['Industry Overview', 'industry', 'sector']) || 'Technology',
      businessType: perplexityAsyncResearch.extractField(content, ['Business Model', 'business model', 'revenue model']) || 'B2B',
      companySize: perplexityAsyncResearch.extractField(content, ['company size', 'size', 'employees']) || 'Small Business',
      targetAudience: perplexityAsyncResearch.extractField(content, ['Target Audience', 'target audience', 'customer segmentation']) || 'Business professionals',
      keyServices: perplexityAsyncResearch.extractArray(content, ['Key Services', 'services', 'products', 'offerings']),
      competitors: perplexityAsyncResearch.extractArray(content, ['Competitive Landscape', 'competitors', 'rivals']),
      seoKeywords: perplexityAsyncResearch.extractArray(content, ['SEO', 'keywords', 'SEO terms', 'search terms']),
      recentNews: perplexityAsyncResearch.extractArray(content, ['Recent Developments', 'recent news', 'latest updates']),
      marketTrends: perplexityAsyncResearch.extractArray(content, ['Market Trends', 'trends', 'market developments']),
      uniqueValueProp: perplexityAsyncResearch.extractField(content, ['unique value proposition', 'differentiator', 'positioning']) || 'Quality service and customer focus',
      brandTone: perplexityAsyncResearch.extractField(content, ['tone', 'voice', 'style']) || 'Professional',
      contentGoals: perplexityAsyncResearch.extractArray(content, ['content goals', 'marketing objectives']),
      audiencePainPoints: perplexityAsyncResearch.extractArray(content, ['challenges', 'pain points', 'problems']),
      audienceGoals: perplexityAsyncResearch.extractArray(content, ['goals', 'objectives']),
      socialMediaPresence: {
        platforms: perplexityAsyncResearch.extractArray(content, ['social media', 'platforms', 'LinkedIn']),
        engagement: 'Medium',
        followers: 'Growing'
      },
      websiteAnalysis: {
        domain: 'Not provided',
        description: 'Professional business website',
        keyFeatures: ['Responsive design', 'Contact forms', 'Service information']
      },
      fullReport: content,
      reportSections: perplexityAsyncResearch.extractReportSections(content),
      citations: perplexityAsyncResearch.extractCitations(content),
      jobStatus: 'completed',
      completedAt: new Date().toISOString()
    }

    // Update the database with reprocessed data
    const { error } = await supabase
      .from('research_data')
      .update({
        research_data: reprocessedData,
        updated_at: new Date().toISOString()
      })
      .eq('research_data->>jobId', jobId)

    if (error) {
      console.error('Error updating research data:', error)
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 })
    }

    console.log('✅ Research data reprocessed and updated!')
    
    return NextResponse.json({
      success: true,
      jobId,
      reprocessedData
    })
    
  } catch (error) {
    console.error('Error reprocessing research:', error)
    return NextResponse.json({ 
      error: 'Failed to reprocess research',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
