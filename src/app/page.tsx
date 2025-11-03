'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import { motion } from 'framer-motion'
import { Calendar, Users, Zap, BarChart3, Edit3, FileText, TrendingUp, Clock, Sparkles, ArrowUpRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface DashboardStats {
  contentCreated: number
  scheduled: number
  published: number
  teamMembers: number
  thisWeek: number
  lastWeek: number
}

interface RecentContent {
  id: string
  title: string
  platform: string
  status: string
  created_at: string
  updated_at: string
}

interface ContentTrend {
  date: string
  count: number
}

interface PlatformBreakdown {
  platform: string
  count: number
}

interface UpcomingPost {
  id: string
  title: string
  platform: string
  scheduled_at: string
}

export default function HomePage() {
  const { user, loading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    contentCreated: 0,
    scheduled: 0,
    published: 0,
    teamMembers: 0,
    thisWeek: 0,
    lastWeek: 0
  })
  const [recentContent, setRecentContent] = useState<RecentContent[]>([])
  const [contentTrend, setContentTrend] = useState<ContentTrend[]>([])
  const [platformBreakdown, setPlatformBreakdown] = useState<PlatformBreakdown[]>([])
  const [upcomingPosts, setUpcomingPosts] = useState<UpcomingPost[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    loadDashboardData()

    // Realtime updates: refresh dashboard when team content changes
    let channel: ReturnType<typeof supabase['channel']> | null = null
    const setupRealtime = async () => {
      try {
        const { data: teamMemberData } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .single()
        const teamId = teamMemberData?.team_id
        if (!teamId) return

        channel = supabase
          .channel(`dashboard-content-${teamId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'content_documents',
              filter: `team_id=eq.${teamId}`,
            },
            () => {
              // Debounce slighty to batch rapid events
              setTimeout(() => loadDashboardData(), 150)
            }
          )
          .subscribe()
      } catch (e) {
        console.warn('Realtime setup failed:', e)
      }
    }

    setupRealtime()

    return () => {
      try {
        if (channel) {
          supabase.removeChannel(channel)
        }
      } catch {}
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

      // Calculate date ranges
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 7)
      const fourteenDaysAgo = new Date(today)
      fourteenDaysAgo.setDate(today.getDate() - 14)

      // Get all stats in parallel
      const [
        contentCount,
        scheduledCount,
        publishedCount,
        teamMembersCount,
        recentContentData,
        allContentData,
        scheduledContentData
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
          .limit(5),
        
        // All content for trends and platform breakdown
        supabase
          .from('content_documents')
          .select('created_at, platform')
          .eq('team_id', teamId),
        
        // Upcoming scheduled posts (all scheduled posts, we'll filter by date in processing)
        supabase
          .from('content_documents')
          .select('id, title, platform, metadata')
          .eq('team_id', teamId)
          .eq('status', 'scheduled')
          .not('metadata->scheduled_at', 'is', null)
          .order('metadata->scheduled_at', { ascending: true })
          .limit(20)
      ])

      // Calculate weekly comparison
      const thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - 7)
      const lastWeekStart = new Date(today)
      lastWeekStart.setDate(today.getDate() - 14)

      const allContent = allContentData.data || []
      const thisWeek = allContent.filter((doc: any) => {
        const docDate = new Date(doc.created_at)
        return docDate >= thisWeekStart && docDate < today
      }).length

      const lastWeek = allContent.filter((doc: any) => {
        const docDate = new Date(doc.created_at)
        return docDate >= lastWeekStart && docDate < thisWeekStart
      }).length

      // Generate content trend (last 7 days)
      const trendData: ContentTrend[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const count = allContent.filter((doc: any) => {
          return doc.created_at?.startsWith(dateStr)
        }).length
        trendData.push({
          date: dateStr,
          count
        })
      }

      // Calculate platform breakdown
      const platformCounts: Record<string, number> = {}
      allContent.forEach((doc: any) => {
        const platform = doc.platform || 'other'
        platformCounts[platform] = (platformCounts[platform] || 0) + 1
      })
      const platformData: PlatformBreakdown[] = Object.entries(platformCounts)
        .map(([platform, count]) => ({ platform, count }))
        .sort((a, b) => b.count - a.count)

      // Process upcoming posts
      const upcoming = (scheduledContentData.data || [])
        .map((doc: any) => {
          const scheduledAt = doc.metadata?.scheduled_at
          if (!scheduledAt) return null
          
          // Handle both string and Date formats
          const scheduledDate = new Date(scheduledAt)
          if (isNaN(scheduledDate.getTime())) {
            console.warn('Invalid scheduled date:', scheduledAt)
            return null
          }
          
          const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          // Show posts scheduled for today or in the future, up to 30 days ahead
          if (daysUntil < 0 || daysUntil > 30) return null
          
          return {
            id: doc.id,
            title: doc.title || 'Untitled Post',
            platform: doc.platform || 'other',
            scheduled_at: scheduledAt
          }
        })
        .filter((post): post is UpcomingPost => post !== null)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .slice(0, 3) // Only show top 3 closest upcoming posts

      setStats({
        contentCreated: contentCount.count || 0,
        scheduled: scheduledCount.count || 0,
        published: publishedCount.count || 0,
        teamMembers: teamMembersCount.count || 0,
        thisWeek,
        lastWeek
      })

      setRecentContent(recentContentData.data || [])
      setContentTrend(trendData)
      setPlatformBreakdown(platformData)
      setUpcomingPosts(upcoming)
      
      // Debug logging
      if (scheduledContentData.data && scheduledContentData.data.length > 0) {
        console.log('Dashboard: Found scheduled posts:', scheduledContentData.data.length)
        console.log('Dashboard: Processed upcoming posts:', upcoming.length)
      }
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

      {/* Quick Stats with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            {stats.thisWeek > stats.lastWeek && (
              <div className="flex items-center text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>{Math.round(((stats.thisWeek - stats.lastWeek) / Math.max(stats.lastWeek, 1)) * 100)}%</span>
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-blue-700 mb-1">Content Created</p>
          <p className="text-3xl font-bold text-blue-900">{stats.contentCreated}</p>
          <p className="text-xs text-blue-600 mt-2">{stats.thisWeek} this week</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl shadow-lg border-2 border-green-200 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 rounded-xl shadow-md">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            {stats.scheduled > 0 && (
              <div className="flex items-center text-green-600 text-sm">
                <Clock className="w-4 h-4" />
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-green-700 mb-1">Scheduled</p>
          <p className="text-3xl font-bold text-green-900">{stats.scheduled}</p>
          <p className="text-xs text-green-600 mt-2">{upcomingPosts.length} upcoming</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-lg border-2 border-purple-200 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500 rounded-xl shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {stats.published > 0 && (
              <div className="flex items-center text-purple-600 text-sm">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-purple-700 mb-1">Published</p>
          <p className="text-3xl font-bold text-purple-900">{stats.published}</p>
          <p className="text-xs text-purple-600 mt-2">Live content</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-lg border-2 border-orange-200 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500 rounded-xl shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-orange-700 mb-1">Team Members</p>
          <p className="text-3xl font-bold text-orange-900">{stats.teamMembers}</p>
          <p className="text-xs text-orange-600 mt-2">Active collaborators</p>
        </motion.div>
      </div>

      {/* Charts and Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Content Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Content Creation Trend
            </h3>
            <span className="text-xs text-gray-500">Last 7 days</span>
          </div>
          <div className="flex items-end justify-between h-32 space-x-2">
            {contentTrend.map((day, index) => {
              const maxCount = Math.max(...contentTrend.map(d => d.count), 1)
              const height = (day.count / maxCount) * 100
              const date = new Date(day.date)
              const isToday = date.toDateString() === new Date().toDateString()
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="relative w-full flex justify-center mb-2">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday ? 'bg-gradient-to-t from-blue-500 to-blue-400' : 'bg-gradient-to-t from-gray-300 to-gray-200'
                      }`}
                      style={{ height: `${Math.max(height, 8)}%`, minHeight: '8px' }}
                    >
                      {day.count > 0 && (
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700">
                          {day.count}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Platform Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
            Platform Breakdown
          </h3>
          {platformBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No content yet</p>
          ) : (
            <div className="space-y-3">
              {platformBreakdown.slice(0, 4).map((platform, index) => {
                const total = platformBreakdown.reduce((sum, p) => sum + p.count, 0)
                const percentage = total > 0 ? (platform.count / total) * 100 : 0
                
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">{platform.platform}</span>
                      <span className="text-sm font-bold text-gray-900">{platform.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getPlatformIcon(platform.platform)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Activity and Upcoming Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Recent Content
            </h3>
            <Link href="/publishing/drafts" className="text-sm text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          <div className="p-6">
            {recentContent.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">No content yet</p>
                <Link href="/content-studio" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Start creating →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentContent.map((content, index) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <div className={`w-3 h-3 rounded-full ${getPlatformIcon(content.platform)} shadow-sm`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {content.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">{formatTimeAgo(content.updated_at)}</p>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 capitalize">{content.platform}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${getStatusColor(content.status)}`}>
                      {content.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Scheduled Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-green-600" />
              Upcoming Posts
            </h3>
            <Link href="/publishing/calendar" className="text-sm text-green-600 hover:text-green-700">
              View calendar →
            </Link>
          </div>
          <div className="p-6">
            {upcomingPosts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">No posts scheduled</p>
                <Link href="/publishing/calendar" className="text-sm text-green-600 hover:text-green-700 font-medium">
                  Schedule content →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingPosts.map((post, index) => {
                  const scheduledDate = new Date(post.scheduled_at)
                  const daysUntil = Math.ceil((scheduledDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  const timeStr = scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-green-50 transition-colors border border-green-100"
                    >
                      <div className={`w-3 h-3 rounded-full ${getPlatformIcon(post.platform)} shadow-sm`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs font-medium text-green-600">
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{timeStr}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200"
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              href="/content-studio"
              className="p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all text-center group"
            >
              <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900">The Forge</p>
              <p className="text-xs text-gray-500 mt-1">Create content</p>
            </Link>
            <Link 
              href="/editor"
              className="p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 hover:shadow-md transition-all text-center group"
            >
              <Edit3 className="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900">Anvil</p>
              <p className="text-xs text-gray-500 mt-1">Edit & refine</p>
            </Link>
            <Link 
              href="/research"
              className="p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 hover:shadow-md transition-all text-center group"
            >
              <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900">Quarry</p>
              <p className="text-xs text-gray-500 mt-1">Research tools</p>
            </Link>
            <Link 
              href="/publishing/calendar"
              className="p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 hover:shadow-md transition-all text-center group"
            >
              <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900">Timeline</p>
              <p className="text-xs text-gray-500 mt-1">Schedule posts</p>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}