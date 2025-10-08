import { NextRequest, NextResponse } from 'next/server'
import { perplexityAsyncResearch } from '@/lib/perplexity-async'
import { aiResearch } from '@/lib/ai-research'
import { supabase } from '@/lib/supabase'

export async function GET() {
  console.log('🎯 GET request to Perplexity API route!')
  console.log('🔧 perplexityAsyncResearch type:', typeof perplexityAsyncResearch)
  console.log('🔧 perplexityAsyncResearch methods:', Object.getOwnPropertyNames(perplexityAsyncResearch))
  console.log('🔧 researchCompany method:', typeof perplexityAsyncResearch.researchCompany)
  return NextResponse.json({ 
    message: 'Perplexity API route is working!',
    perplexityType: typeof perplexityAsyncResearch,
    hasResearchCompany: typeof perplexityAsyncResearch.researchCompany
  })
}

export async function POST(request: NextRequest) {
  console.log('🎯🎯🎯 PERPLEXITY API ROUTE CALLED! 🎯🎯🎯')
  console.log('🎯 Request URL:', request.url)
  console.log('🎯 Request method:', request.method)
  try {
    const { companyName, website, teamId, clientProfileId } = await request.json()
    console.log('📝 Request body parsed:', { companyName, website, teamId, clientProfileId })

    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    if (companyName.length < 2) {
      return NextResponse.json(
        { error: 'Company name must be at least 2 characters' },
        { status: 400 }
      )
    }

    console.log('🔍 Starting research for company:', companyName)
    console.log('🌐 Website:', website || 'Not provided')
    console.log('🔑 Perplexity API key present:', process.env.PERPLEXITY_API_KEY ? 'Yes' : 'No')
    console.log('🔑 OpenRouter API key present:', process.env.OPENROUTER_API_KEY ? 'Yes' : 'No')

    let research
    let researchType = 'perplexity'
    let errorMessage = null

    try {
      // Try Perplexity first
      console.log('🚀 Attempting Perplexity research...')
      console.log('🔧 Perplexity service instance:', !!perplexityAsyncResearch)
      console.log('🔧 Perplexity service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(perplexityAsyncResearch)))
      
      research = await perplexityAsyncResearch.researchCompany(companyName, website, teamId, clientProfileId)
      
      console.log('✅ Perplexity research completed successfully!')
      console.log('📊 Research data keys:', Object.keys(research))
    } catch (perplexityError) {
      console.warn('❌ Perplexity research failed, falling back to OpenRouter')
      console.error('Perplexity error details:', perplexityError)
      console.error('Perplexity error stack:', perplexityError instanceof Error ? perplexityError.stack : 'No stack')
      
      // Add error details to response for debugging
      errorMessage = perplexityError instanceof Error ? perplexityError.message : 'Unknown Perplexity error'
      console.log('🔍 Perplexity error message:', errorMessage)
      
      // Fallback to OpenRouter
      try {
        console.log('🔄 Attempting OpenRouter fallback...')
        research = await aiResearch.researchCompany(companyName)
        researchType = 'openrouter'
        console.log('✅ OpenRouter research completed successfully!')
        console.log('📊 Research data keys:', Object.keys(research))
      } catch (openRouterError) {
        console.error('❌ Both Perplexity and OpenRouter research failed!')
        console.error('OpenRouter error details:', openRouterError)
        throw new Error('All research methods failed')
      }
    }

    // Save research data to database if teamId and clientProfileId are provided
    if (teamId && clientProfileId) {
      try {
        const { error: saveError } = await supabase
          .from('research_data')
          .upsert({
            team_id: teamId,
            client_profile_id: clientProfileId,
            research_type: researchType,
            research_data: {
              ...research,
              jobId: researchType === 'perplexity' ? research.jobId : null,
              jobStatus: 'completed',
              completedAt: new Date().toISOString()
            }
          })

        if (saveError) {
          console.error('Error saving research data:', saveError)
          // Don't fail the request if saving fails
        } else {
          console.log('Research data saved successfully')
        }
      } catch (saveError) {
        console.error('Error saving research data:', saveError)
        // Don't fail the request if saving fails
      }
    }

    return NextResponse.json({
      success: true,
      data: research,
      researchType: researchType,
      perplexityError: researchType === 'openrouter' ? errorMessage : null
    })

  } catch (error) {
    console.error('Perplexity research API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'
    
    console.error('Full error details:', { errorMessage, errorStack })
    
    return NextResponse.json(
      { 
        error: 'Failed to research company with Perplexity',
        details: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    )
  }
}
