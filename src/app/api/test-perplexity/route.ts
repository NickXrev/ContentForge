import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.PERPLEXITY_API_KEY || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || ''
  
  console.log('🔑 API Key present:', apiKey ? 'Yes' : 'No')
  console.log('🔑 API Key length:', apiKey?.length || 0)
  console.log('🔑 API Key starts with:', apiKey?.substring(0, 10) || 'N/A')

  if (!apiKey) {
    return NextResponse.json({ error: 'No API key found' })
  }

  try {
    console.log('🚀 Testing Perplexity API...')
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10
      })
    })

    console.log('📡 Response status:', response.status)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error response:', errorText)
      return NextResponse.json({ 
        error: 'Perplexity API failed',
        status: response.status,
        details: errorText
      })
    }

    const data = await response.json()
    console.log('✅ Success!', data)
    
    return NextResponse.json({ 
      success: true,
      response: data
    })

  } catch (error) {
    console.error('❌ Fetch error:', error)
    return NextResponse.json({ 
      error: 'Fetch failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}














