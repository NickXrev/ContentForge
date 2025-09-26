'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import ContentCard from './ContentCard'

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

interface CalendarGridProps {
  currentDate: Date
  viewMode: 'week' | 'month'
  posts: Post[]
  onDateSelect: (date: Date | null) => void
  onEdit?: (post: Post) => void
  onDuplicate?: (post: Post) => void
  onDelete?: (post: Post) => void
}

// Droppable Day Component
function DroppableDay({ 
  date, 
  posts, 
  isCurrentDay, 
  isCurrentMonthDay, 
  isSelected, 
  formatDayHeader, 
  onDateSelect, 
  onEdit, 
  onDuplicate, 
  onDelete 
}: {
  date: Date
  posts: Post[]
  isCurrentDay: boolean
  isCurrentMonthDay: boolean
  isSelected: boolean
  formatDayHeader: (date: Date) => string
  onDateSelect: (date: Date | null) => void
  onEdit?: (post: Post) => void
  onDuplicate?: (post: Post) => void
  onDelete?: (post: Post) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${date.toISOString()}`,
  })

  return (
    <div 
      ref={setNodeRef}
      className={`
        border-r border-gray-200 min-h-32 p-2 transition-colors
        ${isOver ? 'bg-blue-50 border-blue-300' : ''}
        ${!isCurrentMonthDay ? 'bg-gray-50' : 'bg-white'}
        ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
      `}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`
            text-sm font-medium
            ${isCurrentDay ? 'text-blue-600' : isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'}
          `}>
            {formatDayHeader(date)}
          </span>
          {isCurrentDay && (
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          )}
        </div>
        
        <button
          onClick={() => {
            onDateSelect(isSelected ? null : date)
          }}
          className="text-xs text-gray-400 hover:text-gray-600 px-1 py-0.5 rounded hover:bg-gray-100"
        >
          Add Note
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-2">
        {posts.slice(0, 3).map((post) => (
          <ContentCard 
            key={post.id} 
            post={post} 
            viewMode="calendar"
            compact={true}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
        
        {posts.length > 3 && (
          <div className="text-xs text-gray-500 text-center py-1">
            +{posts.length - 3} more
          </div>
        )}
      </div>
    </div>
  )
}

export default function CalendarGrid({ currentDate, viewMode, posts, onDateSelect, onEdit, onDuplicate, onDelete }: CalendarGridProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const getDaysInView = () => {
    if (viewMode === 'week') {
      // Start with current day instead of Sunday
      const startOfWeek = new Date(currentDate)
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        return date
      })
    } else {
      // Month view - show current month starting from current day
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      
      // Start from the 1st of the month, but reorder to show current day first
      const days = []
      const current = new Date(startOfMonth)
      const end = new Date(endOfMonth)
      
      // Add all days of the month
      while (current <= end) {
        days.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      
      // Reorder so current day comes first, then the rest
      const todayIndex = days.findIndex(day => day.toDateString() === today.toDateString())
      if (todayIndex > 0) {
        const reorderedDays = [
          ...days.slice(todayIndex), // Current day and future days
          ...days.slice(0, todayIndex) // Past days
        ]
        return reorderedDays
      }
      
      return days
    }
  }

  const getPostsForDate = (date: Date) => {
    // Filter posts by actual scheduled date
    const dateString = date.toISOString().split('T')[0]
    return posts.filter(post => post.scheduledDate === dateString)
  }

  const formatDayHeader = (date: Date) => {
    if (viewMode === 'week') {
      const today = new Date()
      const isToday = date.toDateString() === today.toDateString()
      
      if (isToday) {
        return 'Today'
      }
      
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const isTomorrow = date.toDateString() === tomorrow.toDateString()
      
      if (isTomorrow) {
        return 'Tomorrow'
      }
      
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      const today = new Date()
      const isToday = date.toDateString() === today.toDateString()
      
      if (isToday) {
        return 'Today'
      }
      
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const days = getDaysInView()

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 min-h-full">
        {days.map((date, index) => {
          const dayPosts = getPostsForDate(date)
          const isCurrentDay = isToday(date)
          const isCurrentMonthDay = isCurrentMonth(date)
          const isSelected = selectedDate?.toDateString() === date.toDateString()

          return (
            <DroppableDay
              key={index}
              date={date}
              posts={dayPosts}
              isCurrentDay={isCurrentDay}
              isCurrentMonthDay={isCurrentMonthDay}
              isSelected={isSelected}
              formatDayHeader={formatDayHeader}
              onDateSelect={(date) => {
                setSelectedDate(date)
                onDateSelect(date)
              }}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          )
        })}
      </div>
    </div>
  )
}
