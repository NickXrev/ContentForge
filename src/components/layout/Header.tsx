'use client'

import React from 'react'
import { Menu, Bell, Search, HelpCircle, User } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

interface HeaderProps {
  user: any
  onSidebarToggle: () => void
}

export default function Header({ user, onSidebarToggle }: HeaderProps) {
  const { signOut } = useAuth()
  const userInitials = user?.user_metadata?.full_name 
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('')
    : user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {userInitials}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Welcome, {user?.user_metadata?.full_name || 'User'}!
              </h1>
              <p className="text-sm text-gray-500">
                Ready to create amazing content
              </p>
            </div>
          </div>
        </div>

        {/* Center - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search content, campaigns, or team members..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Trial/Subscription info */}
          <div className="hidden lg:block text-sm text-gray-600">
            <span className="text-green-600 font-medium">Free Plan</span>
            <span className="mx-2">•</span>
            <span>Unlimited content</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            
            <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>

            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Upgrade Plan
            </button>

            <button
              onClick={async () => {
                try { await signOut() } catch {}
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

















