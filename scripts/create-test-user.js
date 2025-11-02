/**
 * Script to create test users for ContentForge
 * Usage: node scripts/create-test-user.js <email> <password> <full_name>
 * 
 * Example:
 * node scripts/create-test-user.js test@example.com password123 "Test User"
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function createTestUser(email, password, fullName) {
  try {
    console.log(`Creating user: ${email} (${fullName})...`)

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)
    
    if (existingUser) {
      console.log(`⚠️  User already exists with email: ${email}`)
      console.log(`   User ID: ${existingUser.id}`)
      console.log(`   Email confirmed: ${existingUser.email_confirmed_at ? 'Yes' : 'No'}`)
      return { user: existingUser, existed: true }
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      throw new Error(`Auth creation failed: ${authError.message}`)
    }

    console.log(`✅ Auth user created: ${authData.user.id}`)

    // Create user in public.users table
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'editor'
      }, { onConflict: 'id' })

    if (userError) {
      console.error(`⚠️  Warning: Failed to create user profile: ${userError.message}`)
    } else {
      console.log(`✅ User profile created in public.users`)
    }

    // Create team and team membership
    const localPart = email.split('@')[0]
    const teamName = `${fullName}'s Team`
    
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamName,
        description: 'Auto-created team',
        owner_id: authData.user.id
      })
      .select('id')
      .single()

    if (teamError || !teamData) {
      console.error(`⚠️  Warning: Failed to create team: ${teamError?.message || 'Unknown error'}`)
    } else {
      console.log(`✅ Team created: ${teamData.id}`)

      // Create team membership
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          user_id: authData.user.id,
          role: 'admin'
        })

      if (memberError) {
        console.error(`⚠️  Warning: Failed to create team membership: ${memberError.message}`)
      } else {
        console.log(`✅ Team membership created`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ USER CREATED SUCCESSFULLY')
    console.log('='.repeat(60))
    console.log(`Email:    ${email}`)
    console.log(`Password: ${password}`)
    console.log(`Name:     ${fullName}`)
    console.log(`User ID:  ${authData.user.id}`)
    console.log('='.repeat(60))
    console.log('\nLogin URL:', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    console.log('')

    return { user: authData.user, existed: false }
  } catch (error) {
    console.error('❌ Error creating user:', error.message)
    throw error
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
if (args.length < 3) {
  console.error('Usage: node scripts/create-test-user.js <email> <password> <full_name>')
  console.error('\nExample:')
  console.error('  node scripts/create-test-user.js test@example.com password123 "Test User"')
  process.exit(1)
}

const [email, password, fullName] = args

// Validate email
if (!email.includes('@')) {
  console.error('Error: Invalid email address')
  process.exit(1)
}

// Validate password
if (password.length < 6) {
  console.error('Error: Password must be at least 6 characters')
  process.exit(1)
}

// Run the script
createTestUser(email, password, fullName)
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Failed:', error.message)
    process.exit(1)
  })

