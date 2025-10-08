'use client'

import { useState, useEffect, useMemo } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Share, 
  Filter,
  Plus,
  Calendar as CalendarIcon,
  List,
  Grid,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import PostVolumeChart from '@/components/calendar/PostVolumeChart'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import ContentCard from '@/components/calendar/ContentCard'
import SchedulePostModal from '@/components/calendar/SchedulePostModal'
import { useCalendarData, CalendarPost } from '@/hooks/useCalendarData'
import { supabase } from '@/lib/supabase'

export default function CalendarPage() {
  // Use real data from database
  const { posts, loading, error, updatePostSchedule } = useCalendarData()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'list'>('week')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showUnscheduled, setShowUnscheduled] = useState(true)
  const [unscheduledContent, setUnscheduledContent] = useState<any[]>([])
  const [schedulingPost, setSchedulingPost] = useState<{contentId: string, postId: string, platform: string, content: string} | null>(null)
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    platforms: [] as string[]
  })

  // Mock unscheduled content for now
  const mockUnscheduledContent = [
    {
      id: '1',
      title: 'The Complete Guide to Digital Marketing',
      topic: 'Digital Marketing',
      created_at: new Date().toISOString(),
      social_posts: [
        { id: '1', platform: 'twitter', content: '🚀 Just discovered the key to digital marketing! Here\'s what every marketer needs to know...' },
        { id: '2', platform: 'linkedin', content: 'The landscape of digital marketing is evolving rapidly. Here\'s what industry leaders are doing differently...' },
        { id: '3', platform: 'instagram', content: '✨ The digital marketing transformation you\'ve been waiting for! Swipe to see the complete guide 👆' }
      ]
    },
    {
      id: '2',
      title: 'AI in Healthcare: Future Trends',
      topic: 'AI Healthcare',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      social_posts: [
        { id: '4', platform: 'twitter', content: '🤖 AI is revolutionizing healthcare! Here are the trends shaping the future...' },
        { id: '5', platform: 'linkedin', content: 'After analyzing 100+ AI healthcare implementations, I\'ve identified the common patterns that drive results.' },
        { id: '6', platform: 'instagram', content: '🎯 Ready to explore AI in healthcare? Here\'s everything you need to know! 💫' }
      ]
    }
  ]

  useEffect(() => {
    setUnscheduledContent(mockUnscheduledContent)
  }, [])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getWeekOf = (date: Date) => {
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    return startOfWeek
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    } else if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag started:', event.active.id)
    console.log('Active data:', event.active.data.current)
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    console.log('Drag ended:', { active: active.id, over: over?.id })

    if (over && active.id !== over.id) {
      // Extract the date from the drop zone ID
      const dropZoneId = over.id as string
      console.log('Drop zone ID:', dropZoneId)

      if (dropZoneId.startsWith('day-')) {
        const dateString = dropZoneId.replace('day-', '')
        const newDate = new Date(dateString)
        
        // Find the post being moved
        const post = posts.find(p => p.id === active.id)
        if (post) {
          // Update the post's scheduled date in the database
          updatePostSchedule(
            post.id, 
            newDate.toISOString().split('T')[0], 
            post.scheduledTime
          )
          console.log(`Moved post "${active.id}" to ${newDate.toLocaleDateString()}`)
        }
      }
    }

    setActiveId(null)
  }

  const handleEditPost = (post: any) => {
    console.log('Edit post:', post.id)
    // In a real app, this would open the post editor
  }

  const handleDuplicatePost = (post: any) => {
    console.log('Duplicate post:', post.id)
    // In a real app, this would create a copy of the post
  }

  const handleDeletePost = (post: any) => {
    console.log('Delete post:', post.id)
    // In a real app, this would delete the post
  }

  const handlePostScheduled = () => {
    // Refresh the calendar data when a post is scheduled
    window.location.reload() // Simple refresh for now
  }

  const handleScheduleUnscheduledPost = (contentId: string, postId: string, platform: string, content: string) => {
    setSchedulingPost({ contentId, postId, platform, content })
    // Set default date to today
    const today = new Date().toISOString().split('T')[0]
    setScheduleData({
      date: today,
      time: '12:00',
      platforms: [platform]
    })
  }

  const handleScheduleUnscheduled = async () => {
    if (!schedulingPost) return

    try {
      const scheduledDateTime = new Date(`${scheduleData.date}T${scheduleData.time}`).toISOString()

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

      // Save to content_documents table
      const { data, error } = await supabase
        .from('content_documents')
        .insert([{
          team_id: teamData.team_id,
          title: `Scheduled ${schedulingPost.platform} post`,
          content: schedulingPost.content,
          platform: schedulingPost.platform,
          created_by: user.id,
          status: 'scheduled',
          metadata: {
            scheduled_at: scheduledDateTime,
            original_content_id: schedulingPost.contentId
          }
        }])
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Post scheduled successfully:', data)

      // Remove the scheduled post from unscheduled content
      setUnscheduledContent(prev => 
        prev.map(content => 
          content.id === schedulingPost.contentId
            ? {
                ...content,
                social_posts: content.social_posts.filter((post: any) => post.id !== schedulingPost.postId)
              }
            : content
        ).filter(content => content.social_posts.length > 0)
      )

      alert(`Post scheduled for ${scheduleData.date} at ${scheduleData.time}!`)
      setSchedulingPost(null)
      
      // Refresh calendar data
      window.location.reload()
    } catch (error) {
      console.error('Error scheduling post:', error)
      alert(`Error scheduling post: ${error.message || 'Please try again.'}`)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Error loading calendar</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndContext 
      collisionDetection={closestCenter}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Today
            </button>

            <div className="text-lg font-semibold text-gray-900">
              {viewMode === 'week' 
                ? `Week of ${formatDate(getWeekOf(currentDate))}`
                : formatDate(currentDate)
              }
            </div>
          </div>

          {/* Center - View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'week' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'month' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUnscheduled(!showUnscheduled)}
              className={`p-2 rounded-md transition-colors ${
                showUnscheduled 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={showUnscheduled ? 'Hide unscheduled content' : 'Show unscheduled content'}
            >
              <FileText className="w-5 h-5" />
            </button>
            
            <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
            
            <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
              <Share className="w-5 h-5 text-gray-600" />
            </button>
            
            <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
              <Filter className="w-5 h-5 text-gray-600" />
            </button>

            <button 
              onClick={() => setShowScheduleModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Schedule Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* Post Volume Chart */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <PostVolumeChart currentDate={currentDate} viewMode={viewMode} posts={posts} />
      </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Unscheduled Content Sidebar */}
          <div className={`bg-gray-50 border-r border-gray-200 transition-all duration-300 ${
            showUnscheduled ? 'w-80' : 'w-0'
          } overflow-hidden`}>
            <div className="h-full flex flex-col">
              {/* Unscheduled Header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Unscheduled Content</h3>
                  <button
                    onClick={() => setShowUnscheduled(!showUnscheduled)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {unscheduledContent.length} content pieces ready to schedule
                </p>
              </div>

              {/* Unscheduled Content List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {unscheduledContent.map((content) => (
                  <div key={content.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {content.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {content.topic} • {new Date(content.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Social Posts */}
                    <div className="space-y-2">
                      {content.social_posts.map((post: any) => (
                        <div key={post.id} className="bg-gray-50 rounded p-2 text-xs">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${
                              post.platform === 'twitter' ? 'bg-blue-500' :
                              post.platform === 'linkedin' ? 'bg-blue-700' :
                              post.platform === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                              'bg-gray-500'
                            }`} />
                            <span className="font-medium text-gray-700 capitalize">
                              {post.platform}
                            </span>
                          </div>
                          <p className="text-gray-600 line-clamp-2">
                            {post.content}
                          </p>
                          <button 
                            onClick={() => handleScheduleUnscheduledPost(content.id, post.id, post.platform, post.content)}
                            className="mt-2 w-full text-center px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            Schedule
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {unscheduledContent.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No unscheduled content</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Create content in Content Studio
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="flex-1 overflow-auto">
          {viewMode === 'list' ? (
            <div className="p-6">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled posts</h3>
                  <p className="text-gray-600 mb-4">Create your first post to get started with content scheduling.</p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2 mx-auto">
                    <Plus className="w-4 h-4" />
                    <span>Create Post</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <ContentCard 
                      key={post.id} 
                      post={post} 
                      viewMode="list"
                      onEdit={handleEditPost}
                      onDuplicate={handleDuplicatePost}
                      onDelete={handleDeletePost}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <CalendarGrid 
              currentDate={currentDate} 
              viewMode={viewMode} 
              posts={posts}
              onDateSelect={setSelectedDate}
              onEdit={handleEditPost}
              onDuplicate={handleDuplicatePost}
              onDelete={handleDeletePost}
            />
          )}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <div className="opacity-50">
              <ContentCard 
                post={posts.find(p => p.id === activeId)!} 
                viewMode={viewMode}
                compact={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Schedule Post Modal */}
      <SchedulePostModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onPostScheduled={handlePostScheduled}
      />

      {/* Schedule Unscheduled Post Modal */}
      {schedulingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Schedule {schedulingPost.platform.charAt(0).toUpperCase() + schedulingPost.platform.slice(1)} Post
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{schedulingPost.content}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSchedulingPost(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleUnscheduled}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Schedule
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DndContext>
  )
}
