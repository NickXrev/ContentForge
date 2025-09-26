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
  Grid
} from 'lucide-react'
import PostVolumeChart from '@/components/calendar/PostVolumeChart'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import ContentCard from '@/components/calendar/ContentCard'
import SchedulePostModal from '@/components/calendar/SchedulePostModal'
import { useCalendarData, CalendarPost } from '@/hooks/useCalendarData'

export default function CalendarPage() {
  // Use real data from database
  const { posts, loading, error, updatePostSchedule } = useCalendarData()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'list'>('week')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)


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
    </DndContext>
  )
}
