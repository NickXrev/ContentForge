'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface UnscheduledPost {
  id: string
  title: string
  content: string
  platform: string
  status: string
  created_at: string
  updated_at: string
  created_by?: string
  team_id?: string
  hashtags?: string[]
  topic?: string
}

export function useUnscheduledPosts() {
  const [posts, setPosts] = useState<UnscheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user's team
      const { data: teamData, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (teamError || !teamData) {
        throw new Error('User not part of any team')
      }

      // Fetch content documents WITHOUT scheduled_at dates (unscheduled posts)
      const { data: contentData, error: contentError } = await supabase
        .from('content_documents')
        .select(`
          id,
          title,
          content,
          platform,
          status,
          created_at,
          updated_at,
          created_by,
          team_id,
          hashtags,
          topic
        `)
        .eq('team_id', teamData.team_id)
        .is('scheduled_at', null)
        .order('created_at', { ascending: false })

      if (contentError) {
        throw contentError
      }

      setPosts(contentData || [])
    } catch (err) {
      console.error('Error fetching unscheduled posts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
    } finally {
      setLoading(false)
    }
  }

  const schedulePost = async (postId: string, scheduledDate: string, scheduledTime: string) => {
    try {
      // Parse the scheduled date and time
      const [hours, minutes] = scheduledTime.split(':').map(Number)
      const [year, month, day] = scheduledDate.split('-').map(Number)
      
      const scheduledAt = new Date(year, month - 1, day, hours, minutes)
      
      const { error } = await supabase
        .from('content_documents')
        .update({ 
          scheduled_at: scheduledAt.toISOString(),
          status: 'scheduled'
        })
        .eq('id', postId)

      if (error) {
        throw error
      }

      // Remove the post from unscheduled list
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
      
      return true
    } catch (err) {
      console.error('Error scheduling post:', err)
      setError(err instanceof Error ? err.message : 'Failed to schedule post')
      return false
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  return {
    posts,
    loading,
    error,
    refetch: fetchPosts,
    schedulePost
  }
}
