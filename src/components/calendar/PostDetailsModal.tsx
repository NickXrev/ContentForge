'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Edit, 
  Copy, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  Hash,
  Image as ImageIcon,
  ExternalLink,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  Eye,
  MessageCircle,
  Heart,
  Share2
} from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string
  platform: string
  scheduledTime: string
  status: string
  imageUrl: string
  account: string
  hashtags: string[]
}

interface PostDetailsModalProps {
  post: Post | null
  isOpen: boolean
  onClose: () => void
  onEdit: (post: Post) => void
  onDuplicate: (post: Post) => void
  onDelete: (post: Post) => void
}

const platformIcons = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  blog: Globe
}

const platformColors = {
  twitter: 'text-blue-400 bg-blue-50',
  linkedin: 'text-blue-600 bg-blue-50',
  instagram: 'text-pink-500 bg-pink-50',
  facebook: 'text-blue-700 bg-blue-50',
  youtube: 'text-red-500 bg-red-50',
  blog: 'text-gray-600 bg-gray-50'
}

const statusColors = {
  scheduled: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  published: 'bg-green-100 text-green-800 border-green-200',
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  failed: 'bg-red-100 text-red-800 border-red-200'
}

export default function PostDetailsModal({ 
  post, 
  isOpen, 
  onClose, 
  onEdit, 
  onDuplicate, 
  onDelete 
}: PostDetailsModalProps) {
  console.log('PostDetailsModal render:', { isOpen, post: post?.id })
  
  if (!post) return null

  const PlatformIcon = platformIcons[post.platform as keyof typeof platformIcons] || Globe

  const handleAction = (action: string) => {
    switch (action) {
      case 'edit':
        onEdit(post)
        break
      case 'duplicate':
        onDuplicate(post)
        break
      case 'delete':
        onDelete(post)
        break
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platformColors[post.platform as keyof typeof platformColors]}`}>
                    <PlatformIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{post.title}</h2>
                    <p className="text-sm text-gray-500">{post.account}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[post.status as keyof typeof statusColors]}`}>
                    {post.status}
                  </span>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                {/* Post Preview */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{post.account}</p>
                      <p className="text-xs text-gray-500">{post.scheduledTime}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-900 mb-3 leading-relaxed">{post.content}</p>
                  
                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.hashtags.map((hashtag, index) => (
                        <span key={index} className="text-blue-600 text-sm font-medium">
                          #{hashtag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Mock image placeholder */}
                  <div className="bg-white rounded-lg p-8 text-center border-2 border-dashed border-gray-200">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Post preview image</p>
                  </div>
                </div>

                {/* Engagement Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Eye className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-gray-900">1.2K</p>
                    <p className="text-xs text-gray-500">Views</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Heart className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-gray-900">89</p>
                    <p className="text-xs text-gray-500">Likes</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-gray-900">23</p>
                    <p className="text-xs text-gray-500">Comments</p>
                  </div>
                </div>

                {/* Post Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Post Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Scheduled</p>
                        <p className="text-xs text-gray-500">{post.scheduledTime}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Platform</p>
                        <p className="text-xs text-gray-500 capitalize">{post.platform}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleAction('edit')}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  
                  <button
                    onClick={() => handleAction('duplicate')}
                    className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Duplicate</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleAction('delete')}
                    className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
