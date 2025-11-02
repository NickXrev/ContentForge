'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ClientIntelligence {
  company_name: string
  industry: string
  business_type: string
  target_audience: string
  brand_tone: string
  content_goals: string[]
  key_services: string[]
  unique_value_prop: string
  seo_keywords: string[]
  content_preferences: any
}

export interface TrendingTopic {
  topic: string
  trending_score: number
  keywords: string[]
  content_angle: string
  target_audience: string
}

export function useClientIntelligence() {
  const [clientData, setClientData] = useState<ClientIntelligence | null>(null)
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientIntelligence = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user from public.users table first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (userError || !userData) {
        throw new Error('User not found in database')
      }

      // First, try to find a team that has a client profile
      const { data: teamWithProfile, error: teamWithProfileError } = await supabase
        .from('teams')
        .select(`
          id,
          client_profiles!inner(id)
        `)
        .eq('owner_id', userData.id)
        .limit(1)
        .single()

      let teamId = null

      if (teamWithProfile && !teamWithProfileError) {
        // Found a team with a client profile
        teamId = teamWithProfile.id
      } else {
        // No team with profile found, get the most recent team
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, created_at')
          .eq('owner_id', userData.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (teamsError || !teamsData || teamsData.length === 0) {
          // No teams exist, create one
          console.log('No teams found, creating one...')
          const { data: newTeam, error: createTeamError } = await supabase
            .from('teams')
            .insert({
              name: 'My Team',
              description: 'Default team',
              owner_id: userData.id
            })
            .select('id')
            .single()

          if (createTeamError || !newTeam) {
            throw new Error('Failed to create team')
          }
          teamId = newTeam.id
        } else {
          teamId = teamsData[0].id
        }
      }

      // Try to get client profile from database using team_id
      // If multiple exist, get the most recent one
      const { data: profilesData, error: profileError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      const profileData = profilesData && profilesData.length > 0 ? profilesData[0] : null

      if (profileError || !profileData) {
        // No profile found - show setup prompts
        setClientData({
          company_name: '[Set up your company profile]',
          industry: '[Select your industry]',
          business_type: '[B2B, B2C, SaaS, etc.]',
          target_audience: '[Define your target audience]',
          brand_tone: 'professional',
          content_goals: ['brand awareness', 'lead generation'],
          key_services: ['Your key services'],
          unique_value_prop: '[What makes you unique?]',
          seo_keywords: ['your', 'keywords', 'here'],
          content_preferences: {}
        })
      } else {
        // Use real client data (mapping to actual database columns)
        setClientData({
          company_name: profileData.name || '',
          industry: profileData.industry || '',
          business_type: '', // Not stored in current schema
          target_audience: profileData.target_audience || '',
          brand_tone: profileData.brand_voice || 'professional',
          content_goals: profileData.goals || [],
          key_services: [], // Not stored in current schema
          unique_value_prop: '', // Not stored in current schema
          seo_keywords: [], // Not stored in current schema
          content_preferences: {} // Not stored in current schema
        })
      }

      // Get user's team for topic suggestions (use the teamId we already have)
      const finalTeamId = teamId || (await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userData.id)
        .single()).data?.team_id

      // Fetch personalized topic suggestions based on client profile and previous content
      try {
        const topicsResponse = await fetch('/api/generate-topic-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userData.id,
            teamId: finalTeamId
          })
        })

        if (topicsResponse.ok) {
          const topicsData = await topicsResponse.json()
          if (topicsData.topics && Array.isArray(topicsData.topics)) {
            const dedupe = (items: TrendingTopic[]): TrendingTopic[] => {
              const map = new Map<string, TrendingTopic>()
              for (const item of items) {
                const key = item.topic.trim().toLowerCase()
                if (!map.has(key)) map.set(key, item)
              }
              return Array.from(map.values())
            }
            setTrendingTopics(dedupe(topicsData.topics))
          } else {
            console.warn('Invalid topics response format')
            setTrendingTopics([])
          }
        } else {
          console.warn('Failed to fetch personalized topics:', topicsResponse.status)
          setTrendingTopics([])
        }
      } catch (topicsError) {
        console.warn('Error fetching personalized topics:', topicsError)
        setTrendingTopics([])
      }
    } catch (err) {
      console.error('Error fetching client intelligence:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch client data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientIntelligence()
  }, [])

  return {
    clientData,
    trendingTopics,
    loading,
    error,
    refetch: fetchClientIntelligence
  }
}
