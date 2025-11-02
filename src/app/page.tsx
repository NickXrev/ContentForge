'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import { motion } from 'framer-motion'
import { Calendar, Users, Zap, BarChart3, Edit3, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  contentCreated: number
  scheduled: number
  published: number
  teamMembers: number
}

interface RecentContent {
  id: string
  title: string
  platform: string
  status: string
  created_at: string
  updated_at: string
}

export default function HomePage() {
  const { user, loading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    contentCreated: 0,
    scheduled: 0,
    published: 0,
    teamMembers: 0
  })
  const [recentContent, setRecentContent] = useState<RecentContent[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setStatsLoading(true)

      // Get user's team
      const { data: teamMemberData, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user?.id)
        .single()

      if (teamError || !teamMemberData) {
        setStatsLoading(false)
        return
      }

      const teamId = teamMemberData.team_id

      // Get all stats in parallel
      const [
        contentCount,
        scheduledCount,
        publishedCount,
        teamMembersCount,
        recentContentData
      ] = await Promise.all([
        // Total content created
        supabase
          .from('content_documents')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId),
        
        // Scheduled content
        supabase
          .from('content_documents')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .eq('status', 'scheduled'),
        
        // Published content
        supabase
          .from('content_documents')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .eq('status', 'published'),
        
        // Team members
        supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId),
        
        // Recent content (last 5)
        supabase
          .from('content_documents')
          .select('id, title, platform, status, created_at, updated_at')
          .eq('team_id', teamId)
          .order('updated_at', { ascending: false })
          .limit(5)
      ])

      setStats({
        contentCreated: contentCount.count || 0,
        scheduled: scheduledCount.count || 0,
        published: publishedCount.count || 0,
        teamMembers: teamMembersCount.count || 0
      })

      setRecentContent(recentContentData.data || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'review':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin':
        return 'bg-blue-500'
      case 'twitter':
      case 'x':
        return 'bg-blue-400'
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <LoginForm />
      </div>
    )
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your content today
        </p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Content Created</p>
              <p className="text-2xl font-bold text-gray-900">{stats.contentCreated}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Team Members</p>
              <p className="text-2xl font-bold text-gray-900">{stats.teamMembers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Content</h3>
          </div>
          <div className="p-6">
            {recentContent.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No content yet. Start creating!</p>
            ) : (
              <div className="space-y-4">
                {recentContent.map((content) => (
                  <div key={content.id} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${getPlatformIcon(content.platform)}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{content.title}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(content.updated_at)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusColor(content.status)}`}>
                      {content.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <a 
                href="/content-studio"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
              >
                <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">The Forge</p>
              </a>
              <a 
                href="/editor"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center"
              >
                <Edit3 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Editor</p>
              </a>
              <a 
                href="/research"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-center"
              >
                <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Research</p>
              </a>
              <a 
                href="/publishing/calendar"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-center"
              >
                <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Calendar</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}