import { NextRequest, NextResponse } from 'next/server'
import { perplexityDirect } from '@/lib/perplexity-direct'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { companyName, website, teamId } = await request.json()

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    console.log('🔍 Direct research request:', { companyName, website, teamId })

    // Perform direct research using regular sonar model
    const researchResult = await perplexityDirect.researchCompany(companyName, website)
    
    // Extract structured data
    const structuredData = perplexityDirect.extractStructuredData(researchResult.content)

    // Save to database
    const { data: researchData, error: dbError } = await supabase
      .from('research_data')
      .insert({
        team_id: teamId,
        research_type: 'perplexity-direct',
        research_data: {
          ...structuredData,
          jobId: researchResult.jobId,
          citations: researchResult.citations,
          searchResults: researchResult.searchResults,
          usage: researchResult.usage,
          model: researchResult.model
        }
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save research data' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: structuredData,
      researchType: 'perplexity-direct',
      jobId: researchResult.jobId,
      usage: researchResult.usage
    })

  } catch (error) {
    console.error('Direct research error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Research failed' 
    }, { status: 500 })
  }
}










