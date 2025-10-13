import { NextRequest, NextResponse } from 'next/server'
import { aiResearch } from '@/lib/ai-research'

export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json()

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

    console.log('Researching company:', companyName)

    // Research the company using AI
    const research = await aiResearch.researchCompany(companyName)

    console.log('Company research completed:', research)

    return NextResponse.json({
      success: true,
      data: research
    })

  } catch (error) {
    console.error('Company research API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to research company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}








