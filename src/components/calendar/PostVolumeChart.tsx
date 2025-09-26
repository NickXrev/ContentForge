'use client'

import { useState, useEffect } from 'react'

interface PostVolumeChartProps {
  currentDate: Date
  viewMode: 'week' | 'month' | 'list'
  posts?: any[] // Add posts prop to calculate real data
}

export default function PostVolumeChart({ currentDate, viewMode, posts = [] }: PostVolumeChartProps) {
  const [postData, setPostData] = useState<number[]>([])

  useEffect(() => {
    // Calculate real post volume data based on actual posts
    const calculateRealData = () => {
      if (viewMode === 'week') {
        // Calculate posts for 7 days starting from current date
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(currentDate)
          date.setDate(currentDate.getDate() + i)
          const dateString = date.toISOString().split('T')[0]
          return posts.filter(post => post.scheduledDate === dateString).length
        })
      } else if (viewMode === 'month') {
        // Calculate posts for current month
        const today = new Date()
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
        return Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(today.getFullYear(), today.getMonth(), i + 1)
          const dateString = date.toISOString().split('T')[0]
          return posts.filter(post => post.scheduledDate === dateString).length
        })
      }
      return []
    }
    
    setPostData(calculateRealData())
  }, [currentDate, viewMode, posts])

  const getMaxPosts = () => Math.max(...postData, 1)
  const maxPosts = getMaxPosts()

  const getDays = () => {
    if (viewMode === 'week') {
      // Start with current day instead of Sunday
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentDate)
        date.setDate(currentDate.getDate() + i)
        return date
      })
    } else if (viewMode === 'month') {
      // Show current month starting from current day
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      
      const days = []
      const current = new Date(startOfMonth)
      const end = new Date(endOfMonth)
      
      // Add all days of the month
      while (current <= end) {
        days.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      
      // Reorder so current day comes first
      const todayIndex = days.findIndex(day => day.toDateString() === today.toDateString())
      if (todayIndex > 0) {
        return [
          ...days.slice(todayIndex), // Current day and future days
          ...days.slice(0, todayIndex) // Past days
        ]
      }
      
      return days
    }
    return []
  }

  const days = getDays()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Post Volume</h3>
        <div className="text-sm text-gray-500">
          {postData.reduce((a, b) => a + b, 0)} posts scheduled
        </div>
      </div>

      <div className="flex items-end space-x-1 h-16">
        {days.map((day, index) => {
          const postCount = postData[index] || 0
          const height = (postCount / maxPosts) * 100
          const isToday = day.toDateString() === new Date().toDateString()
          const isSelected = day.toDateString() === currentDate.toDateString()

          return (
            <div key={index} className="flex flex-col items-center flex-1">
              {/* Bar */}
              <div className="relative w-full flex justify-center">
                <div
                  className={`w-8 rounded-t transition-all duration-300 ${
                    isToday 
                      ? 'bg-blue-500' 
                      : isSelected 
                        ? 'bg-blue-400' 
                        : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  style={{ height: `${Math.max(height, 8)}%` }}
                >
                  {/* Post count indicator */}
                  {postCount > 0 && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">
                      {postCount}
                    </div>
                  )}
                </div>
              </div>

              {/* Day label */}
              <div className="mt-2 text-xs text-gray-500">
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-4 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-400 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-300 rounded"></div>
          <span>Other days</span>
        </div>
      </div>
    </div>
  )
}
