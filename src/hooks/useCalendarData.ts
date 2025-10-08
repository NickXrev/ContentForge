'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface CalendarPost {
  id: string
  title: string
  content: string
  platform: string
  scheduledDate: string
  scheduledTime: string
  status: string
  imageUrl?: string
  account: string
  hashtags: string[]
  created_by?: string
  team_id?: string
}

export function useCalendarData() {
  const [posts, setPosts] = useState<CalendarPost[]>([])
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

      // Fetch content documents with scheduled posts (status = 'scheduled' and metadata.scheduled_at exists)
      const { data: contentData, error: contentError } = await supabase
        .from('content_documents')
        .select(`
          id,
          title,
          content,
          platform,
          status,
          created_by,
          team_id,
          metadata
        `)
        .eq('team_id', teamData.team_id)
        .eq('status', 'scheduled')
        .not('metadata->scheduled_at', 'is', null)
        .order('metadata->scheduled_at', { ascending: true })

      if (contentError) {
        throw contentError
      }

      // Transform data to calendar format
      const transformedPosts: CalendarPost[] = (contentData || []).map((doc) => {
        const scheduledDate = new Date(doc.metadata?.scheduled_at)
        const dateString = scheduledDate.toISOString().split('T')[0]
        const timeString = scheduledDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })

        return {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          platform: doc.platform || 'linkedin',
          scheduledDate: dateString,
          scheduledTime: timeString,
          status: doc.status || 'scheduled',
          account: '@contentforge', // Default account
          hashtags: [],
          created_by: doc.created_by,
          team_id: doc.team_id
        }
      })

      setPosts(transformedPosts)
    } catch (err) {
      console.error('Error fetching calendar data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar data')
    } finally {
      setLoading(false)
    }
  }

  const updatePostSchedule = async (postId: string, newDate: string, newTime: string) => {
    try {
      // Parse the new date and time
      const [year, month, day] = newDate.split('-').map(Number)
      
      let hours: number, minutes: number
      
      // Handle different time formats
      if (newTime.includes('AM') || newTime.includes('PM')) {
        // Format: "12:55 PM" or "2:30 PM"
        const [timePart, period] = newTime.split(' ')
        const [h, m] = timePart.split(':').map(Number)
        hours = period === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12)
        minutes = m
      } else {
        // Format: "14:30" or "09:00"
        const [h, m] = newTime.split(':').map(Number)
        hours = h
        minutes = m
      }
      
      const newScheduledAt = new Date(year, month - 1, day, hours, minutes)
      
      const { error } = await supabase
        .from('content_documents')
        .update({ 
          metadata: {
            scheduled_at: newScheduledAt.toISOString()
          }
        })
        .eq('id', postId)

      if (error) {
        throw error
      }

      // Update local state
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                scheduledDate: newDate,
                scheduledTime: newTime
              }
            : post
        )
      )
    } catch (err) {
      console.error('Error updating post schedule:', err)
      setError(err instanceof Error ? err.message : 'Failed to update post schedule')
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
    updatePostSchedule
  }
}
