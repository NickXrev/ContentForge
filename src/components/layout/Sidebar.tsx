'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Zap, 
  Inbox, 
  Calendar, 
  BarChart3, 
  Users, 
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  FileText,
  Search,
  Globe,
  Target,
  Edit3,
  CheckSquare,
  Sparkles,
  Image
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/'
  },
  {
    id: 'create',
    label: 'Create',
    icon: Zap,
    children: [
      {
        id: 'content-studio',
        label: 'Content Studio',
        icon: Sparkles,
        href: '/content-studio'
      },
      {
        id: 'research',
        label: 'Research',
        icon: Search,
        href: '/research'
      },
      {
        id: 'editor',
        label: 'Editor',
        icon: Edit3,
        href: '/editor'
      }
    ]
  },
  // Removed Inbox
  // Removed Todos & Tasks
  {
    id: 'publishing',
    label: 'Publishing',
    icon: Calendar,
    children: [
      {
        id: 'calendar',
        label: 'Calendar',
        icon: Calendar,
        href: '/publishing/calendar'
      },
      {
        id: 'drafts',
        label: 'Drafts',
        icon: FileText,
        href: '/publishing/drafts'
      },
      {
        id: 'scheduled',
        label: 'Scheduled',
        icon: Calendar,
        href: '/publishing/scheduled'
      },
      // Removed Campaigns
    ]
  },
  {
    id: 'gallery',
    label: 'Media',
    icon: Image,
    href: '/gallery'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/analytics'
  },
  // Removed Team
  {
    id: 'accounts',
    label: 'Accounts & Settings',
    icon: Settings,
    href: '/accounts'
  }
]

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['forge', 'publishing'])

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)
    const isItemActive = item.href ? isActive(item.href) : false

    return (
      <div key={item.id}>
        {item.href ? (
          <Link
            href={item.href}
            className={`
              flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors
              ${level === 0 ? 'mx-2 my-1' : 'mx-4 my-1'}
              ${isItemActive 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(item.id)
              }
            }}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </div>
            {hasChildren && !collapsed && (
              isExpanded ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
            )}
          </Link>
        ) : (
          <div
            className={`
              flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors
              ${level === 0 ? 'mx-2 my-1' : 'mx-4 my-1'}
              ${isItemActive 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(item.id)
              }
            }}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </div>
            {hasChildren && !collapsed && (
              isExpanded ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
            )}
          </div>
        )}

        {/* Sub-menu items */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="ml-4 space-y-1">
            {item.children!.map(child => (
              <Link
                key={child.id}
                href={child.href!}
                className={`
                  flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors
                  ${isActive(child.href!) 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <child.icon className="w-4 h-4 flex-shrink-0" />
                <span>{child.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`
      bg-gray-800 text-white transition-all duration-300 flex flex-col
      ${collapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">ContentForge</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-gray-700 transition-colors"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Bottom Section - Account & Settings */}
      <div className="border-t border-gray-700 p-4">
        <Link
          href="/settings"
          className={`
            flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors
            ${isActive('/settings') 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }
          `}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Accounts & Settings</span>}
        </Link>
      </div>
    </div>
  )
}
