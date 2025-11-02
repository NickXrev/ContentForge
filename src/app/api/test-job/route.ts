import { NextRequest, NextResponse } from 'next/server'
import { perplexityAsyncResearch } from '@/lib/perplexity-async'

export async function GET() {
  try {
    const jobId = 'b145f023-80b1-427a-b0ce-500eaa107eab'
    
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














