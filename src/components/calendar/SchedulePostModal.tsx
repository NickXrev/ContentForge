'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, Search, Filter, Plus } from 'lucide-react'
import { useUnscheduledPosts, UnscheduledPost } from '@/hooks/useUnscheduledPosts'

interface SchedulePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostScheduled: () => void
  selectedDate?: string
  selectedTime?: string
}

const platformColors = {
  linkedin: 'bg-blue-50 text-blue-600 border-blue-200',
  twitter: 'bg-sky-50 text-sky-600 border-sky-200',
  instagram: 'bg-pink-50 text-pink-600 border-pink-200',
  facebook: 'bg-blue-50 text-blue-700 border-blue-200',
  youtube: 'bg-red-50 text-red-600 border-red-200',
  blog: 'bg-gray-50 text-gray-600 border-gray-200'
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  published: 'bg-blue-100 text-blue-800'
}

export default function SchedulePostModal({ 
  isOpen, 
  onClose, 
  onPostScheduled,
  selectedDate,
  selectedTime 
}: SchedulePostModalProps) {
  const { posts, loading, error, schedulePost } = useUnscheduledPosts()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [schedulingPost, setSchedulingPost] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState(selectedDate || '')
  const [scheduleTime, setScheduleTime] = useState(selectedTime || '09:00')

  // Set default date to today if not provided
  useEffect(() => {
    if (!scheduleDate) {
      setScheduleDate(new Date().toISOString().split('T')[0])
    }
  }, [scheduleDate])

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlatform = selectedPlatform === 'all' || post.platform === selectedPlatform
    const matchesStatus = selectedStatus === 'all' || post.status === selectedStatus
    
    return matchesSearch && matchesPlatform && matchesStatus
  })

  const platforms = [...new Set(posts.map(post => post.platform))]
  const statuses = [...new Set(posts.map(post => post.status))]

  const handleSchedulePost = async (post: UnscheduledPost) => {
    if (!scheduleDate || !scheduleTime) {
      alert('Please select both date and time')
      return
    }

    setSchedulingPost(post.id)
    
    const success = await schedulePost(post.id, scheduleDate, scheduleTime)
    
    if (success) {
      onPostScheduled()
      onClose()
    }
    
    setSchedulingPost(null)
  }

  const handleQuickSchedule = (post: UnscheduledPost, time: string) => {
    setScheduleTime(time)
    handleSchedulePost(post)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Schedule Post</h2>
                <p className="text-gray-600 mt-1">Select a post to schedule for publishing</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Schedule Settings */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Platform Filter */}
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Platforms</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Posts List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading posts...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-500 text-lg font-medium mb-2">Error loading posts</div>
                  <p className="text-gray-600">{error}</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg font-medium mb-2">No posts found</div>
                  <p className="text-gray-600 mb-4">
                    {posts.length === 0 
                      ? "You don't have any unscheduled posts yet. Create some content first!"
                      : "No posts match your current filters."
                    }
                  </p>
                  {posts.length === 0 && (
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      <Plus className="w-4 h-4 inline mr-2" />
                      Create Post
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 group"
                    >
                      {/* Post Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${platformColors[post.platform as keyof typeof platformColors]}`}>
                            {post.platform}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[post.status as keyof typeof statusColors]}`}>
                            {post.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Post Content */}
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
                        <p className="text-gray-600 text-sm line-clamp-3">{post.content}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuickSchedule(post, '09:00')}
                            disabled={schedulingPost === post.id}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                          >
                            Morning
                          </button>
                          <button
                            onClick={() => handleQuickSchedule(post, '14:00')}
                            disabled={schedulingPost === post.id}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                          >
                            Afternoon
                          </button>
                          <button
                            onClick={() => handleQuickSchedule(post, '18:00')}
                            disabled={schedulingPost === post.id}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                          >
                            Evening
                          </button>
                        </div>
                        <button
                          onClick={() => handleSchedulePost(post)}
                          disabled={schedulingPost === post.id}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                        >
                          {schedulingPost === post.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Scheduling...</span>
                            </>
                          ) : (
                            <span>Schedule</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}











