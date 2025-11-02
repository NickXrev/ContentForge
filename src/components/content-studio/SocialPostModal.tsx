'use client'

import { useState } from 'react'
import { X, Calendar, Image as ImageIcon, Edit3, Copy, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SocialPost {
  content: string
  imageUrl?: string
}

interface SocialPostModalProps {
  isOpen: boolean
  onClose: () => void
  post: SocialPost
  platform: string
  onEdit: (newContent: string) => void
  onSchedule: (date: string, time: string) => void
  onGenerateImage: () => void
  isGeneratingImage: boolean
}

export default function SocialPostModal({
  isOpen,
  onClose,
  post,
  platform,
  onEdit,
  onSchedule,
  onGenerateImage,
  isGeneratingImage
}: SocialPostModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(post.content)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('12:00')

  const platformConfig = {
    twitter: {
      name: 'X (Twitter)',
      color: 'bg-sky-500',
      icon: '✖️',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200'
    },
    x: {
      name: 'X (Twitter)',
      color: 'bg-black',
      icon: '✖️',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-300'
    },
    linkedin: {
      name: 'LinkedIn',
      color: 'bg-blue-600',
      icon: '💼',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    instagram: {
      name: 'Instagram',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      icon: '📷',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
      borderColor: 'border-pink-200'
    }
  }

  const config = platformConfig[platform as keyof typeof platformConfig] || {
    name: platform,
    color: 'bg-gray-500',
    icon: '📱',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }

  const handleSaveEdit = () => {
    onEdit(editedContent)
    setIsEditing(false)
  }

  const handleSchedule = () => {
    if (scheduleDate && scheduleTime) {
      onSchedule(scheduleDate, scheduleTime)
      setShowSchedule(false)
      setScheduleDate('')
      setScheduleTime('12:00')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(post.content)
    // You could add a toast notification here
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop with blur effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className={`${config.bgColor} border-b ${config.borderColor} px-6 py-4 flex items-center justify-between`}>
            <div className="flex items-center space-x-3">
              <div className={`${config.color} w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl`}>
                {config.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{config.name} Post</h2>
                <p className="text-sm text-gray-600">Preview and manage your content</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Post Preview */}
            <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg p-6 mb-6`}>
              {post.imageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img 
                    src={post.imageUrl} 
                    alt="Post image" 
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}
              
              {isEditing ? (
                <div className="space-y-4">
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={6}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setEditedContent(post.content)
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{post.content.length} characters</span>
                    {(platform === 'twitter' || platform === 'x') && (
                      <span className={`${post.content.length > 250 ? 'text-red-600 font-medium' : post.content.length > 230 ? 'text-orange-600' : 'text-green-600'}`}>
                        {250 - post.content.length} remaining
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Section */}
            {showSchedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50"
              >
                <h3 className="font-semibold mb-3 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  Schedule Post
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={handleSchedule}
                    disabled={!scheduleDate || !scheduleTime}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => setShowSchedule(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
              </button>
              
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule</span>
              </button>
              
              <button
                onClick={onGenerateImage}
                disabled={isGeneratingImage}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <ImageIcon className="w-4 h-4" />
                <span>{isGeneratingImage ? 'Generating...' : 'Generate Image'}</span>
              </button>
              
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

