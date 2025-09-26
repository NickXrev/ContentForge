// Simple test to check Supabase connection
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://duvzewcpdxwtemzukwzg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dnpld2NwZHh3dGVtenVrd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3Mzc4ODgsImV4cCI6MjA2NTMxMzg4OH0.fuMz2rapueMHVrdEz4lxPieUoM3Mo7EKOQX5TwEioGE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test 1: Simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('Data:', data)
    return true
    
  } catch (err) {
    console.error('❌ Connection error:', err.message)
    return false
  }
}

testConnection()
