import { NextRequest, NextResponse } from 'next/server'
import { perplexityAsyncResearch } from '@/lib/perplexity-async'
import { reportExtractor } from '@/lib/report-extractor'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const jobId = 'b145f023-80b1-427a-b0ce-500eaa107eab'
  
  try {
    console.log('🔄 Extracting metrics from job ID:', jobId)
    
    // Get the raw job response
    const jobStatus = await perplexityAsyncResearch.checkJobStatus(jobId)
    
    if (jobStatus.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Job not completed' }, { status: 400 })
    }

    // Extract the full report content
    const fullReport = jobStatus.response?.choices?.[0]?.message?.content || jobStatus.response || ''
    
    // Use OpenRouter to extract structured metrics from the full report
    const extractedMetrics = await reportExtractor.extractMetrics(fullReport)
    
    const reprocessedData = {
      jobId: jobId,
      // Company Overview
      industry: extractedMetrics.companyOverview?.industry || 'Technology',
      businessType: extractedMetrics.companyOverview?.businessType || 'B2B',
      companySize: extractedMetrics.companyOverview?.companySize || 'Small Business',
      uniqueValueProp: extractedMetrics.companyOverview?.uniqueValueProp || 'Quality service and customer focus',
      brandTone: extractedMetrics.companyOverview?.brandTone || 'Professional',
      
      // Target Audience
      targetAudience: extractedMetrics.targetAudience?.targetAudience || 'Business professionals',
      audiencePainPoints: extractedMetrics.targetAudience?.audiencePainPoints || [],
      audienceGoals: extractedMetrics.targetAudience?.audienceGoals || [],
      
      // Market Trends
      marketTrends: extractedMetrics.marketTrends?.marketTrends || [],
      opportunities: extractedMetrics.marketTrends?.opportunities || [],
      challenges: extractedMetrics.marketTrends?.challenges || [],
      
      // Competitors
      competitors: extractedMetrics.competitors?.competitors || [],
      competitiveAdvantages: extractedMetrics.competitors?.competitiveAdvantages || [],
      marketPosition: extractedMetrics.competitors?.marketPosition || '',
      
      // SEO Keywords
      seoKeywords: extractedMetrics.seoKeywords?.seoKeywords || [],
      contentKeywords: extractedMetrics.seoKeywords?.contentKeywords || [],
      industryKeywords: extractedMetrics.seoKeywords?.industryKeywords || [],
      
      // Social Media
      socialMediaPresence: {
        platforms: extractedMetrics.socialMedia?.platforms || [],
        engagement: extractedMetrics.socialMedia?.engagement || 'Medium',
        strategy: extractedMetrics.socialMedia?.strategy || '',
        followers: extractedMetrics.socialMedia?.followers || 'Growing'
      },
      
      // Website Analysis
      websiteAnalysis: {
        domain: extractedMetrics.websiteAnalysis?.domain || 'Not provided',
        description: extractedMetrics.websiteAnalysis?.description || 'Professional business website',
        keyFeatures: extractedMetrics.websiteAnalysis?.keyFeatures || ['Responsive design', 'Contact forms', 'Service information'],
        optimization: extractedMetrics.websiteAnalysis?.optimization || ''
      },
      
      // Full report and metadata
      fullReport: fullReport,
      reportSections: perplexityAsyncResearch.extractReportSections(fullReport),
      citations: perplexityAsyncResearch.extractCitations(fullReport),
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

    console.log('✅ Metrics extracted and database updated!')
    
    return NextResponse.json({
      success: true,
      jobId,
      extractedMetrics,
      reprocessedData
    })
    
  } catch (error) {
    console.error('Error extracting metrics:', error)
    return NextResponse.json({ 
      error: 'Failed to extract metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}





