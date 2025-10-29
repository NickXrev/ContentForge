'use client'

import React from 'react'
import { 
  Edit, 
  Bell, 
  Zap, 
  HelpCircle, 
  X,
  Plus,
  Share2,
  Download,
  Settings
} from 'lucide-react'

export default function RightSidebar() {
  const utilityIcons = [
    { icon: Edit, label: 'Quick Edit', onClick: () => console.log('Quick Edit') },
    { icon: Bell, label: 'Notifications', onClick: () => console.log('Notifications') },
    { icon: Zap, label: 'AI Assistant', onClick: () => console.log('AI Assistant') },
    { icon: Plus, label: 'Create New', onClick: () => console.log('Create New') },
    { icon: Share2, label: 'Share', onClick: () => console.log('Share') },
    { icon: Download, label: 'Export', onClick: () => console.log('Export') },
    { icon: Settings, label: 'Settings', onClick: () => console.log('Settings') },
    { icon: HelpCircle, label: 'Help', onClick: () => console.log('Help') }
  ]

  return (
    <div className="w-12 bg-gray-100 border-l border-gray-200 flex flex-col items-center py-4 space-y-3">
      {utilityIcons.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          className="p-2 rounded-md hover:bg-gray-200 transition-colors group relative"
          title={item.label}
        >
          <item.icon className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
          
          {/* Tooltip */}
          <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            {item.label}
          </div>
        </button>
      ))}
    </div>
  )
}













