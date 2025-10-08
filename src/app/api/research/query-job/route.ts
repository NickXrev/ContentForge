import { NextRequest, NextResponse } from 'next/server'
import { perplexityAsyncResearch } from '@/lib/perplexity-async'

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    console.log('🔍 Querying job ID:', jobId)
    
    // Get the raw job status and response
    const jobStatus = await perplexityAsyncResearch.checkJobStatus(jobId)
    
    console.log('📊 Job status:', jobStatus.status)
    console.log('📄 Raw response:', jobStatus.response)
    
    return NextResponse.json({
      jobId,
      status: jobStatus.status,
      rawResponse: jobStatus.response,
      completedAt: jobStatus.completedAt,
      startedAt: jobStatus.startedAt
    })
    
  } catch (error) {
    console.error('Error querying job:', error)
    return NextResponse.json({ 
      error: 'Failed to query job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}





