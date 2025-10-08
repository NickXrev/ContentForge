'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import Sidebar from './Sidebar'
import Header from './Header'
import RightSidebar from './RightSidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)


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



