'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import Sidebar from './Sidebar'
import Header from './Header'
import RightSidebar from './RightSidebar'
import { supabase } from '@/lib/supabase'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Preload trending topics when user logs in
  useEffect(() => {
    if (user && !loading) {
      // Trigger topic generation in background
      const preloadTopics = async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (!authUser) return

          // Get user's team
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('id', authUser.id)
            .single()

          if (!userData) return

          const { data: teamMemberData } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', userData.id)
            .single()

          const teamId = teamMemberData?.team_id

          // Check cache first
          const cacheKey = `topics_${teamId || userData.id}`
          const cacheData = localStorage.getItem(cacheKey)
          const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

          if (cacheData) {
            try {
              const cached = JSON.parse(cacheData)
              const cacheAge = Date.now() - cached.timestamp
              if (cacheAge < CACHE_DURATION && cached.topics && cached.topics.length > 0) {
                // Cache is still valid, no need to regenerate
                return
              }
            } catch (e) {
              // Invalid cache, continue to generate
            }
          }

          // Generate topics in background
          fetch('/api/generate-topic-suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userData.id,
              teamId: teamId
            })
          }).catch(err => console.warn('Background topic preload failed:', err))
        } catch (error) {
          console.warn('Error preloading topics:', error)
        }
      }

      preloadTopics()
    }
  }, [user, loading])


  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to ContentForge</h1>
            <p className="text-gray-600 mt-2">Please sign in to continue</p>
          </div>
          <LoginForm />
        </div>
      </div>
    )
  }

  // TEMPORARY: Force login page for testing
  // Remove this block once you're happy with the auth flow
  if (false) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to ContentForge</h1>
            <p className="text-gray-600 mt-2">Please sign in to continue</p>
          </div>
          <LoginForm />
        </div>
      </div>
    )
  }


        return (
          <div className="flex h-screen bg-gray-50">
            {/* Left Sidebar */}
            <Sidebar 
              collapsed={sidebarCollapsed} 
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
            />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <Header 
                user={user}
                onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
              
              {/* Main Content */}
              <main className="flex-1 overflow-auto">
                <div className="h-full">
                  {children}
                </div>
              </main>
            </div>
            
            {/* Right Sidebar */}
            <RightSidebar />
          </div>
        )
}



