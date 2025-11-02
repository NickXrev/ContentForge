import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { envServer } from '@/lib/env-server'

export async function POST(request: NextRequest) {
  try {
    const { id, email, full_name } = await request.json()

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })
    }

    const supabase = createClient(envServer.NEXT_PUBLIC_SUPABASE_URL, envServer.SUPABASE_SERVICE_ROLE_KEY)

    // Upsert user in public.users
    const { error: userError } = await supabase
      .from('users')
      .upsert(
        {
          id,
          email,
          full_name: full_name || null,
          role: 'editor'
        },
        { onConflict: 'id' }
      )

    if (userError) {
      return NextResponse.json(
        {
          error: 'User upsert failed',
          message: userError.message,
          details: (userError as any).details,
          hint: (userError as any).hint,
          code: (userError as any).code,
        },
        { status: 500 }
      )
    }

    // Ensure team exists and user is a member
    const { data: existingMembership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', id)
      .limit(1)
      .maybeSingle()

    let teamId = existingMembership?.team_id ?? null

    if (!teamId) {
      // Try to find a team owned by this user
      const { data: ownedTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', id)
        .limit(1)
        .maybeSingle()

      if (ownedTeam?.id) {
        teamId = ownedTeam.id
      } else {
        // Create a personal team
        const localPart = email.split('@')[0]
        const teamName = `${full_name ? full_name + "'s" : localPart + "'s"} Team`
        const { data: createdTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            description: 'Auto-created team',
            owner_id: id
          })
          .select('id')
          .single()

        if (teamError || !createdTeam) {
          console.error('Team creation failed:', teamError)
          // Don't fail the whole request, but log it
        } else {
          teamId = createdTeam.id
        }
      }
    }

    // Ensure team_members row exists
    if (teamId) {
      const { error: memberError } = await supabase
        .from('team_members')
        .upsert(
          { team_id: teamId, user_id: id, role: 'admin' },
          { onConflict: 'team_id,user_id' }
        )

      if (memberError) {
        console.error('Team member creation failed:', memberError)
        // Don't fail the whole request
      }
    }

    return NextResponse.json({ ok: true, teamId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
