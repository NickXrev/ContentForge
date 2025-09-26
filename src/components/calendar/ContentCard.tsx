'use client'

import { useState, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { 
  MoreHorizontal, 
  MessageCircle, 
  Calendar, 
  Bookmark, 
  Eye, 
  Edit,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  Clock,
  User,
  Hash,
  Image as ImageIcon,
  ExternalLink,
  GripVertical
} from 'lucide-react'
import PostDetailsModal from './PostDetailsModal'

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

interface ContentCardProps {
  post: Post
  viewMode: 'calendar' | 'list'
  compact?: boolean
  onEdit?: (post: Post) => void
  onDuplicate?: (post: Post) => void
  onDelete?: (post: Post) => void
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
  twitter: 'text-blue-400',
  linkedin: 'text-blue-600',
  instagram: 'text-pink-500',
  facebook: 'text-blue-700',
  youtube: 'text-red-500',
  blog: 'text-gray-600'
}

const platformBgs = {
  twitter: 'bg-blue-50 border-blue-200',
  linkedin: 'bg-blue-50 border-blue-200',
  instagram: 'bg-pink-50 border-pink-200',
  facebook: 'bg-blue-50 border-blue-200',
  youtube: 'bg-red-50 border-red-200',
  blog: 'bg-gray-50 border-gray-200'
}

const statusColors = {
  scheduled: 'bg-amber-100 text-amber-800 border-amber-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  draft: 'bg-slate-100 text-slate-800 border-slate-200',
  failed: 'bg-red-100 text-red-800 border-red-200'
}

export default function ContentCard({ 
  post, 
  viewMode, 
  compact = false, 
  onEdit,
  onDuplicate,
  onDelete
}: ContentCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
    data: {
      post: post
    }
  })

  // Utility function to strip HTML tags while preserving formatting
  const stripHtmlTags = (html: string) => {
    if (typeof window === 'undefined') {
      // Server-side: simple regex approach
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    }
    
    // Client-side: use DOM parsing for better accuracy
    const temp = document.createElement('div')
    temp.innerHTML = html
    let text = temp.textContent || temp.innerText || ''
    text = text.replace(/\s+/g, ' ').trim()
    return text
  }

  if (!isClient) {
    // Render without drag functionality during SSR
    return (
      <div className="bg-white border rounded-xl p-3">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border">
              <Globe className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs font-semibold text-gray-900 truncate">{post.account}</span>
              <span className="text-xs text-gray-500 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{post.scheduledTime}</span>
              </span>
            </div>
            <p className="text-gray-900 line-clamp-2 leading-relaxed text-xs">
              {stripHtmlTags(post.content)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const PlatformIcon = platformIcons[post.platform as keyof typeof platformIcons] || Globe

  const handleCardClick = () => {
    console.log('Card clicked:', post.id)
    setShowDetails(true)
  }

  const handleActionClick = (action: string) => {
    switch (action) {
      case 'edit':
        onEdit?.(post)
        break
      case 'duplicate':
        onDuplicate?.(post)
        break
      case 'delete':
        onDelete?.(post)
        break
    }
    setShowActions(false)
  }

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  if (viewMode === 'list') {
    return (
      <>
        <motion.div
          ref={setNodeRef}
          style={style}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          className={`
            bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer
            ${isDragging ? 'opacity-50 shadow-2xl' : ''}
            ${platformBgs[post.platform as keyof typeof platformBgs]}
          `}
          onClick={handleCardClick}
        >
          <div className="flex items-start space-x-4">
            {/* Drag Handle */}
            <div
              {...listeners}
              {...attributes}
              className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 cursor-grab active:cursor-grabbing"
              onMouseDown={() => console.log('Mouse down on drag handle:', post.id)}
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            {/* Platform Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border">
                <PlatformIcon className={`w-5 h-5 ${platformColors[post.platform as keyof typeof platformColors]}`} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-sm font-semibold text-gray-900">{post.account}</span>
                <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[post.status as keyof typeof statusColors]}`}>
                  {post.status}
                </span>
                <span className="text-xs text-gray-500 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{post.scheduledTime}</span>
                </span>
              </div>
              
              <p className="text-sm text-gray-900 mb-2 line-clamp-2 leading-relaxed">{post.content}</p>
              
              {post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {post.hashtags.map((hashtag, index) => (
                    <span key={index} className="text-xs text-blue-600 font-medium">#{hashtag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowActions(!showActions)
                  }}
                  className="p-2 rounded-lg hover:bg-white/80 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-gray-500" />
                </button>
                
                {showActions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-10 overflow-hidden"
                  >
                    <div className="py-1">
                      <button
                        onClick={() => handleActionClick('edit')}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit Post</span>
                      </button>
                      <button
                        onClick={() => handleActionClick('duplicate')}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Duplicate</span>
                      </button>
                      <button
                        onClick={() => handleActionClick('delete')}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <PostDetailsModal
          post={post}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          onEdit={onEdit || (() => {})}
          onDuplicate={onDuplicate || (() => {})}
          onDelete={onDelete || (() => {})}
        />
      </>
    )
  }

  // Calendar view
  return (
    <>
        <motion.div
          ref={setNodeRef}
          style={style}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          className={`
            bg-white border rounded-xl hover:shadow-lg transition-all duration-200 group relative
            ${compact ? 'p-3' : 'p-4'}
            ${isDragging ? 'opacity-50 shadow-2xl scale-105' : ''}
            ${post.status === 'scheduled' ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200'}
            ${platformBgs[post.platform as keyof typeof platformBgs]}
          `}
        >
        {/* Clickable overlay for opening details - positioned above drag handle */}
        <div
          className="absolute inset-0 z-20 cursor-pointer"
          onClick={handleCardClick}
        />
        
        {/* Drag Handle - Subtle */}
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/80 cursor-grab active:cursor-grabbing bg-white/90 border border-gray-200 shadow-sm z-30"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="w-3 h-3 text-gray-500" />
        </div>

        <div className="flex items-start space-x-3">
          {/* Platform Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border">
              <PlatformIcon className={`w-4 h-4 ${platformColors[post.platform as keyof typeof platformColors]}`} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs font-semibold text-gray-900 truncate">{post.account}</span>
              <span className="text-xs text-gray-500 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{post.scheduledTime}</span>
              </span>
            </div>
            
            <p className={`text-gray-900 line-clamp-2 leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
              {stripHtmlTags(post.content)}
            </p>
            
            {post.hashtags.length > 0 && !compact && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.hashtags.slice(0, 2).map((hashtag, index) => (
                  <span key={index} className="text-xs text-blue-600 font-medium">#{hashtag}</span>
                ))}
                {post.hashtags.length > 2 && (
                  <span className="text-xs text-gray-500">+{post.hashtags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status and Actions */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[post.status as keyof typeof statusColors]}`}>
            {post.status}
          </span>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleActionClick('comment')
              }}
              className="p-1.5 rounded-md hover:bg-white/80 transition-colors"
            >
              <MessageCircle className="w-3 h-3 text-gray-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleActionClick('bookmark')
              }}
              className="p-1.5 rounded-md hover:bg-white/80 transition-colors"
            >
              <Bookmark className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        </div>
      </motion.div>

      <PostDetailsModal
        post={post}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onEdit={onEdit || (() => {})}
        onDuplicate={onDuplicate || (() => {})}
        onDelete={onDelete || (() => {})}
      />
    </>
  )
}