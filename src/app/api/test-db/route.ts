import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Test if content_documents table exists
    const { data, error } = await supabase
      .from('content_documents')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({ 
        error: 'Table does not exist or has issues',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Table exists and is accessible',
      data: data 
    })
  } catch (err) {
    return NextResponse.json({ 
      error: 'Database connection failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}








