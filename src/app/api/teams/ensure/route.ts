'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { envServer } from '@/lib/env-server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    const supabase = createClient(envServer.NEXT_PUBLIC_SUPABASE_URL, envServer.SUPABASE_SERVICE_ROLE_KEY)

    // Find auth user by exact email
    const usersRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUser = usersRes.data?.users?.find((u: any) => u.email === email)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = authUser.id as string

    // Ensure exists in public.users
    await supabase.from('users').upsert({ id: userId, email }, { onConflict: 'id' })

    // Check existing membership
    const { data: existingMembership, error: membershipErr } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId)
      .limit(1)

    if (membershipErr) {
      return NextResponse.json({ error: membershipErr.message }, { status: 500 })
    }

    let teamId: string | null = existingMembership?.[0]?.team_id ?? null

    if (!teamId) {
      // Try to find a team owned by this user first
      const { data: ownedTeam } = await supabase
        .from('teams')
        .select('id, name')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle()

      if (ownedTeam?.id) {
        teamId = ownedTeam.id
      } else {
        // Create a personal team
        const localPart = email.split('@')[0]
        const teamName = `Personal Team - ${localPart}`
        const { data: createdTeam, error: createErr } = await supabase
          .from('teams')
          .insert({ name: teamName, description: 'Auto-created team', owner_id: userId })
          .select('id, name')
          .single()

        if (createErr || !createdTeam) {
          return NextResponse.json({ error: createErr?.message || 'Failed to create team' }, { status: 500 })
        }
        teamId = createdTeam.id
      }
    }

    // Ensure team_members row exists
    const { error: insertMemberErr } = await supabase
      .from('team_members')
      .upsert({ team_id: teamId, user_id: userId, role: 'admin' }, { onConflict: 'team_id,user_id' })

    if (insertMemberErr) {
      return NextResponse.json({ error: insertMemberErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, teamId, userId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}






