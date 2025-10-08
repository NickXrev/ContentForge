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
      const { data: profileData, error: profileError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('team_id', teamId)
        .single()

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

      // Get trending topics for their industry (or Technology as fallback)
      const industry = profileData?.industry || 'Technology'
      const { data: topicsData, error: topicsError } = await supabase
        .rpc('get_trending_topics', { 
          client_industry: industry,
          limit_count: 5
        })

      if (topicsError) {
        console.warn('Could not fetch trending topics:', topicsError)
        // Fallback to mock data - Updated for Q4 2025
        setTrendingTopics([
          {
            topic: 'AI-Powered Business Automation',
            trending_score: 98,
            keywords: ['AI automation', 'business efficiency', 'workflow optimization', 'productivity tools'],
            content_angle: 'How AI is transforming business operations and workflow management',
            target_audience: 'Business owners and managers'
          },
          {
            topic: 'Sustainable Business Practices',
            trending_score: 92,
            keywords: ['sustainability', 'ESG', 'green business', 'carbon footprint'],
            content_angle: 'The growing importance of sustainability in business strategy',
            target_audience: 'Business leaders and decision makers'
          },
          {
            topic: 'Personal Branding in the Digital Age',
            trending_score: 89,
            keywords: ['personal branding', 'thought leadership', 'social media', 'professional growth'],
            content_angle: 'Building a strong personal brand to advance your career',
            target_audience: 'Professionals and entrepreneurs'
          },
          {
            topic: 'Cybersecurity for Small Businesses',
            trending_score: 85,
            keywords: ['cybersecurity', 'data protection', 'small business security', 'threat prevention'],
            content_angle: 'Essential cybersecurity measures every small business needs',
            target_audience: 'Small business owners and IT managers'
          },
          {
            topic: 'Customer Experience Innovation',
            trending_score: 87,
            keywords: ['customer experience', 'CX', 'customer satisfaction', 'service excellence'],
            content_angle: 'Innovative approaches to delivering exceptional customer experiences',
            target_audience: 'Customer service and marketing teams'
          }
        ])
      } else {
        setTrendingTopics(topicsData || [])
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
