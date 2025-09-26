'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { Save, Settings, Bot, Database, Users, Plus, X, BarChart3, UserCheck, Activity, Clock, TrendingUp, Search } from 'lucide-react'

interface AdminConfig {
  id?: string
  key: string
  value: string
  description: string
  category: 'ai' | 'system' | 'billing' | 'features'
  updated_at?: string
}

interface UserStats {
  id: string
  email: string
  full_name: string
  role: string
  team_name: string
  content_count: number
  last_active: string
  created_at: string
  // Enhanced tracking data
  login_count?: number
  total_sessions?: number
  preferred_device?: string
  preferred_browser?: string
  preferred_os?: string
  most_common_country?: string
  most_common_city?: string
  timezone?: string
  language?: string
  is_active?: boolean
  last_ip_address?: string
  registration_source?: string
  referral_source?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
}

interface SystemStats {
  total_users: number
  total_teams: number
  total_content: number
  total_ai_requests: number
  active_users_today: number
  popular_models: Array<{ model: string; count: number }>
  // Enhanced team-based stats
  active_users?: number
  analytics_records?: number
  // Research tool stats
  total_research?: number
  completed_research?: number
  failed_research?: number
  research_models?: Array<{ model: string; count: number }>
}

// AI Model Dropdown Component
interface AIModelDropdownProps {
  value: string
  onChange: (value: string) => void
  onAddModel: (model: string) => void
}

function AIModelDropdown({ value, onChange, onAddModel }: AIModelDropdownProps) {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newModel, setNewModel] = useState('')

  const availableModels = [
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
    'openai/gpt-5-mini',
    'meta-llama/llama-3.1-8b-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'anthropic/claude-3-haiku',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3-opus',
    'google/gemini-pro',
    'google/gemini-pro-vision'
  ]

  const handleAddModel = () => {
    if (newModel.trim()) {
      onAddModel(newModel.trim())
      setNewModel('')
      setIsAddingNew(false)
    }
  }

  return (
    <div className="space-y-3">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
      >
        {availableModels.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>

      {isAddingNew ? (
        <div className="flex space-x-2">
          <input
            type="text"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            placeholder="Enter new model name (e.g., openai/gpt-5)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
          <Button
            onClick={handleAddModel}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => {
              setIsAddingNew(false)
              setNewModel('')
            }}
            variant="outline"
            size="sm"
            className="text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => setIsAddingNew(true)}
          variant="outline"
          size="sm"
          className="text-gray-700 border-gray-300 hover:bg-gray-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Custom Model
        </Button>
      )}
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const [configs, setConfigs] = useState<AdminConfig[]>([])
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'config' | 'research'>('overview')

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminStatus()
    loadConfigs()
    loadUserStats()
    loadSystemStats()
  }, [user])

  const checkAdminStatus = async () => {
    if (!user) return

    try {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .single()

      setIsAdmin(teamMember?.role === 'admin')
    } catch (err) {
      console.error('Error checking admin status:', err)
    }
  }

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_configs')
        .select('*')
        .order('category', { ascending: true })

      if (error) throw error
      setConfigs(data || [])
    } catch (err) {
      setError(`Failed to load configs: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadUserStats = async () => {
    try {
      console.log('Loading team-based user stats...')
      
      // First, try to get team members with a simpler query
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          role,
          joined_at,
          teams(name, id)
        `)

      if (teamError) {
        console.error('Team members error:', teamError)
        console.error('Error details:', teamError.message, teamError.details)
        
        // Fallback: try to get users directly if team_members fails
        console.log('Falling back to direct users query...')
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email, user_metadata, created_at, last_sign_in_at')
          .limit(50)

        if (usersError) {
          console.error('Users query also failed:', usersError)
          throw usersError
        }

        console.log('Fallback users data:', users)
        
        // Create basic user stats from users table
        const basicUserStats = users?.map(user => ({
          id: user.id,
          email: user.email || 'Unknown',
          full_name: user.user_metadata?.full_name || 'Unknown',
          role: 'viewer', // Default role
          team_name: 'No Team',
          content_count: 0,
          last_active: user.last_sign_in_at || user.created_at,
          created_at: user.created_at,
          login_count: 0,
          total_sessions: 0,
          preferred_device: 'Unknown',
          preferred_browser: 'Unknown',
          preferred_os: 'Unknown',
          most_common_country: 'Unknown',
          most_common_city: 'Unknown',
          timezone: 'UTC',
          language: 'en',
          is_active: user.last_sign_in_at ? 
            new Date(user.last_sign_in_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false,
          last_ip_address: 'Unknown',
          registration_source: 'Direct',
          referral_source: null,
          utm_source: null,
          utm_medium: null,
          utm_campaign: null
        })) || []

        setUserStats(basicUserStats)
        return
      }

      console.log('Team members data:', teamMembers)

      if (!teamMembers || teamMembers.length === 0) {
        console.log('No team members found')
        setUserStats([])
        return
      }

      // Get user details for each team member
      const userStatsPromises = teamMembers.map(async (member) => {
        // Get user details
        const { data: userData } = await supabase
          .from('users')
          .select('email, user_metadata, created_at, last_sign_in_at')
          .eq('id', member.user_id)
          .single()

        // Get content count
        const { count: contentCount } = await supabase
          .from('content_documents')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', member.user_id)

        // Try to get activity stats (may not exist yet)
        const { data: activityStats } = await supabase
          .from('user_daily_stats')
          .select('*')
          .eq('team_id', member.teams[0]?.id)
          .eq('user_id', member.user_id)
          .order('date', { ascending: false })
          .limit(1)
          .single()

        return {
          id: member.user_id,
          email: userData?.email || 'Unknown',
          full_name: userData?.user_metadata?.full_name || 'Unknown',
          role: member.role,
          team_name: member.teams[0]?.name || 'Unknown',
          content_count: contentCount || 0,
          last_active: activityStats?.last_activity || userData?.last_sign_in_at || member.joined_at,
          created_at: userData?.created_at || member.joined_at,
          // Enhanced tracking data from team analytics
          login_count: activityStats?.sessions || 0,
          total_sessions: activityStats?.sessions || 0,
          preferred_device: 'Unknown',
          preferred_browser: 'Unknown',
          preferred_os: 'Unknown',
          most_common_country: 'Unknown',
          most_common_city: 'Unknown',
          timezone: 'UTC',
          language: 'en',
          is_active: activityStats?.last_activity ? 
            new Date(activityStats.last_activity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false,
          last_ip_address: 'Unknown',
          registration_source: 'Direct',
          referral_source: null,
          utm_source: null,
          utm_medium: null,
          utm_campaign: null
        }
      })

      const userStatsData = await Promise.all(userStatsPromises)
      console.log('Team-based user stats data:', userStatsData)
      setUserStats(userStatsData)
    } catch (err) {
      console.error('Failed to load user stats:', err)
      console.error('Error details:', err)
      setError(`Failed to load user stats: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const loadSystemStats = async () => {
    try {
      // Get total counts
      const [usersResult, teamsResult, contentResult, researchResult] = await Promise.all([
        supabase.from('team_members').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('content_documents').select('*', { count: 'exact', head: true }),
        supabase.from('company_research').select('*', { count: 'exact', head: true })
      ])

      // Get research status breakdown
      const { data: researchStatusData } = await supabase
        .from('company_research')
        .select('research_status')

      const researchStatusCounts = researchStatusData?.reduce((acc, research) => {
        const status = research.research_status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Get popular AI models
      const { data: modelData } = await supabase
        .from('content_documents')
        .select('ai_model')
        .not('ai_model', 'is', null)

      const modelCounts = modelData?.reduce((acc, doc) => {
        const model = doc.ai_model || 'unknown'
        acc[model] = (acc[model] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const popularModels = Object.entries(modelCounts)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Get research models (from admin configs)
      const { data: researchModelData } = await supabase
        .from('admin_configs')
        .select('value')
        .eq('key', 'research_model')
        .single()

      const researchModels = researchModelData?.value ? 
        [{ model: researchModelData.value, count: researchStatusCounts.completed || 0 }] : []

      setSystemStats({
        total_users: usersResult.count || 0,
        total_teams: teamsResult.count || 0,
        total_content: contentResult.count || 0,
        total_ai_requests: Object.values(modelCounts).reduce((sum, count) => sum + count, 0),
        active_users_today: userStats.length, // This will be updated when userStats loads
        popular_models: popularModels,
        // Research tool stats
        total_research: researchResult.count || 0,
        completed_research: researchStatusCounts.completed || 0,
        failed_research: researchStatusCounts.failed || 0,
        research_models: researchModels
      })
    } catch (err) {
      console.error('Failed to load system stats:', err)
    }
  }

  const updateConfig = async (key: string, value: string) => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      console.log('Attempting to update config:', { key, value })
      
      // First, let's check if the table exists by trying to select from it
      const { data: testData, error: testError } = await supabase
        .from('admin_configs')
        .select('*')
        .limit(1)

      if (testError) {
        console.error('Table access error:', testError)
        throw new Error(`Table access failed: ${testError.message}`)
      }

      console.log('Table access successful, proceeding with upsert')

      // Try insert first, then update if it fails
      let { error } = await supabase
        .from('admin_configs')
        .insert({
          key,
          value,
          description: 'Updated via admin panel',
          category: 'ai',
          updated_at: new Date().toISOString()
        })

      // If insert fails (key already exists), try update
      if (error && error.code === '23505') { // Unique constraint violation
        console.log('Key exists, trying update instead')
        const { error: updateError } = await supabase
          .from('admin_configs')
          .update({
            value,
            updated_at: new Date().toISOString()
          })
          .eq('key', key)
        
        error = updateError
      }

      if (error) {
        console.error('Upsert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        })
        throw error
      }

      console.log('Config updated successfully')
      setSuccess(`Updated ${key} successfully!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Full error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        fullError: JSON.stringify(err, null, 2)
      })
      setError(`Failed to update ${key}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ai': return <Bot className="w-5 h-5" />
      case 'system': return <Settings className="w-5 h-5" />
      case 'billing': return <Database className="w-5 h-5" />
      case 'features': return <Users className="w-5 h-5" />
      default: return <Settings className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ai': return 'bg-purple-50 border-purple-200 text-purple-800'
      case 'system': return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'billing': return 'bg-green-50 border-green-200 text-green-800'
      case 'features': return 'bg-orange-50 border-orange-200 text-orange-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access the admin panel.</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
          <p className="text-gray-600">System overview, user management, and configuration</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'users', name: 'Users & Teams', icon: Users },
                { id: 'research', name: 'Research', icon: Search },
                { id: 'config', name: 'Configuration', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6"
          >
            {success}
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab systemStats={systemStats} userStats={userStats} />
        )}

        {activeTab === 'users' && (
          <UsersTab userStats={userStats} />
        )}

        {activeTab === 'research' && (
          <ResearchTab systemStats={systemStats} />
        )}

        {activeTab === 'config' && (
          <ConfigTab 
            configs={configs} 
            updateConfig={updateConfig} 
            saving={saving}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
          />
        )}
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ systemStats, userStats }: { systemStats: SystemStats | null, userStats: UserStats[] }) {
  if (!systemStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats.total_users}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Database className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats.total_teams}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bot className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Content Generated</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats.total_content}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">AI Requests</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats.total_ai_requests}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Popular AI Models */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular AI Models</h3>
        <div className="space-y-3">
          {systemStats.popular_models.map((model, index) => (
            <div key={model.model} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-600 mr-2">#{index + 1}</span>
                <span className="text-sm text-gray-900">{model.model}</span>
              </div>
              <span className="text-sm font-medium text-blue-600">{model.count} uses</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Research Tool Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Tool Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{systemStats.total_research || 0}</p>
            <p className="text-sm text-gray-600">Total Research</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{systemStats.completed_research || 0}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{systemStats.failed_research || 0}</p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
        </div>
        {systemStats.research_models && systemStats.research_models.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Research Model</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">{systemStats.research_models[0].model}</span>
              <span className="text-sm font-medium text-green-600">{systemStats.research_models[0].count} analyses</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Recent Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h3>
        <div className="space-y-3">
          {userStats.slice(0, 5).map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.role}</p>
                <p className="text-xs text-gray-500">{user.content_count} content</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// Users Tab Component
function UsersTab({ userStats }: { userStats: UserStats[] }) {
  console.log('UsersTab rendering with userStats:', userStats)
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Users & Teams</h3>
        <p className="text-sm text-gray-600">Manage users, roles, and team assignments</p>
      </div>
      
      {userStats.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
          <p className="text-gray-500">No team members found. Users will appear here once they join teams.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userStats.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">
                          {user.is_active ? '🟢 Active' : '🔴 Inactive'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : user.role === 'editor'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.team_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>📝 {user.content_count} content</div>
                      <div>🔑 {user.login_count || 0} logins</div>
                      <div>📱 {user.total_sessions || 0} sessions</div>
                      <div className="text-xs text-gray-500">
                        Last: {new Date(user.last_active).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>📱 {user.preferred_device || 'Unknown'}</div>
                      <div>🌐 {user.preferred_browser || 'Unknown'}</div>
                      <div>💻 {user.preferred_os || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">
                        {user.language || 'en'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>🌍 {user.most_common_country || 'Unknown'}</div>
                      <div>🏙️ {user.most_common_city || 'Unknown'}</div>
                      <div>🕐 {user.timezone || 'UTC'}</div>
                      <div className="text-xs text-gray-500">
                        IP: {user.last_ip_address || 'Unknown'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>📊 {user.registration_source || 'Direct'}</div>
                      {user.utm_source && (
                        <div className="text-xs text-gray-500">
                          UTM: {user.utm_source}
                          {user.utm_medium && ` / ${user.utm_medium}`}
                          {user.utm_campaign && ` / ${user.utm_campaign}`}
                        </div>
                      )}
                      {user.referral_source && (
                        <div className="text-xs text-gray-500">
                          Ref: {user.referral_source}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Config Tab Component
function ConfigTab({ 
  configs, 
  updateConfig, 
  saving, 
  getCategoryIcon, 
  getCategoryColor 
}: {
  configs: AdminConfig[]
  updateConfig: (key: string, value: string) => Promise<void>
  saving: boolean
  getCategoryIcon: (category: string) => React.ReactElement
  getCategoryColor: (category: string) => string
}) {
  return (
    <div className="grid gap-6">
      {['ai', 'system', 'billing', 'features'].map(category => {
        const categoryConfigs = configs.filter(config => config.category === category)
        
        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-lg ${getCategoryColor(category)} mr-3`}>
                {getCategoryIcon(category)}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {category} Configuration
              </h2>
            </div>

            {categoryConfigs.length === 0 ? (
              <p className="text-gray-500 italic">No configuration items for this category.</p>
            ) : (
              <div className="space-y-4">
                {categoryConfigs.map(config => (
                  <ConfigItem
                    key={config.key}
                    config={config}
                    onUpdate={updateConfig}
                    saving={saving}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

interface ConfigItemProps {
  config: AdminConfig
  onUpdate: (key: string, value: string) => Promise<void>
  saving: boolean
}

function ConfigItem({ config, onUpdate, saving }: ConfigItemProps) {
  const [value, setValue] = useState(config.value)
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = async () => {
    await onUpdate(config.key, value)
    setIsEditing(false)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">{config.key}</h3>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                loading={saving}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false)
                  setValue(config.value)
                }}
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Edit
            </Button>
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{config.description}</p>
      
      {isEditing ? (
        config.key === 'ai_model' ? (
          <AIModelDropdown
            value={value}
            onChange={setValue}
            onAddModel={(newModel) => {
              // This would add a new model to the available options
              console.log('Adding new model:', newModel)
            }}
          />
        ) : config.key === 'research_model' ? (
          <AIModelDropdown
            value={value}
            onChange={setValue}
            onAddModel={(newModel) => {
              // This would add a new model to the available options
              console.log('Adding new research model:', newModel)
            }}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder={`Enter value for ${config.key}`}
          />
        )
      ) : (
        <div className="bg-gray-50 px-3 py-2 rounded-md">
          <code className="text-sm text-gray-800">{config.value}</code>
        </div>
      )}
    </div>
  )
}

// Research Tab Component
function ResearchTab({ systemStats }: { systemStats: SystemStats | null }) {
  const [researchData, setResearchData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResearch, setSelectedResearch] = useState<any>(null)

  useEffect(() => {
    loadResearchData()
  }, [])

  const loadResearchData = async () => {
    try {
      console.log('Loading research data...')
      
      // First get the basic research records
      const { data: researchRecords, error: researchError } = await supabase
        .from('company_research')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (researchError) {
        console.error('Error loading research records:', researchError)
        return
      }

      console.log('Research records:', researchRecords)

      // For each research record, get the related data
      const enrichedResearch = await Promise.all(
        (researchRecords || []).map(async (research) => {
          // Get website analysis
          const { data: websiteAnalysis } = await supabase
            .from('website_analysis')
            .select('*')
            .eq('research_id', research.id)
            .single()

          // Get company intelligence
          const { data: companyIntelligence } = await supabase
            .from('company_intelligence')
            .select('*')
            .eq('research_id', research.id)
            .single()

          console.log(`Research ${research.id}:`, {
            websiteAnalysis,
            companyIntelligence
          })

          return {
            ...research,
            website_analysis: websiteAnalysis,
            company_intelligence: companyIntelligence
          }
        })
      )

      console.log('Enriched research data:', enrichedResearch)
      setResearchData(enrichedResearch)
    } catch (err) {
      console.error('Error loading research data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Research Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Search className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Research</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats?.total_research || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats?.completed_research || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats?.failed_research || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Research Results */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Research</h3>
          <p className="text-sm text-gray-600">Latest company research and analysis</p>
        </div>

        {researchData.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Research Yet</h3>
            <p className="text-gray-500">Research data will appear here once teams start using the research tool</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {researchData.map((research) => (
              <div key={research.id} className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Search className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <button 
                        onClick={() => {
                          console.log('Clicked on:', research.company_name, 'Current selected:', selectedResearch?.id)
                          setSelectedResearch(selectedResearch?.id === research.id ? null : research)
                        }}
                        className={`text-lg font-semibold transition-colors cursor-pointer ${
                          selectedResearch?.id === research.id 
                            ? 'text-blue-600 bg-blue-50 px-2 py-1 rounded' 
                            : 'text-gray-900 hover:text-blue-600'
                        }`}
                      >
                        {research.company_name} {selectedResearch?.id === research.id ? '▼' : '▶'}
                      </button>
                      <p className="text-sm text-gray-500">{research.website_url}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    research.research_status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : research.research_status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {research.research_status.replace('_', ' ')}
                  </span>
                </div>

                {/* Basic info always shown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Industry:</span>
                    <p className="text-sm text-gray-900">{research.company_intelligence?.industry || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Business Type:</span>
                    <p className="text-sm text-gray-900">{research.company_intelligence?.business_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Tone:</span>
                    <p className="text-sm text-gray-900">{research.company_intelligence?.tone_of_voice || 'Not specified'}</p>
                  </div>
                </div>

                {/* Detailed view when selected */}
                {selectedResearch?.id === research.id && research.company_intelligence && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-6">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h5>
                    
                    {/* Target Audience */}
                    {research.company_intelligence.target_audience && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Target Audience</h6>
                        <p className="text-sm text-gray-900">{research.company_intelligence.target_audience}</p>
                      </div>
                    )}

                    {/* Value Proposition */}
                    {research.company_intelligence.value_proposition && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Value Proposition</h6>
                        <p className="text-sm text-gray-900">{research.company_intelligence.value_proposition}</p>
                      </div>
                    )}

                    {/* Key Services */}
                    {research.company_intelligence.key_services && research.company_intelligence.key_services.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Key Services</h6>
                        <div className="flex flex-wrap gap-2">
                          {research.company_intelligence.key_services.map((service: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Products */}
                    {research.company_intelligence.key_products && research.company_intelligence.key_products.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Key Products</h6>
                        <div className="flex flex-wrap gap-2">
                          {research.company_intelligence.key_products.map((product: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                              {product}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pricing */}
                    {research.company_intelligence.pricing_info && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Pricing</h6>
                        <p className="text-sm text-gray-900">{research.company_intelligence.pricing_info}</p>
                      </div>
                    )}

                    {/* Key Messages */}
                    {research.company_intelligence.key_messages && research.company_intelligence.key_messages.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Key Messages</h6>
                        <div className="space-y-1">
                          {research.company_intelligence.key_messages.map((message: string, index: number) => (
                            <p key={index} className="text-sm text-gray-900">• {message}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Competitive Advantages */}
                    {research.company_intelligence.competitive_advantages && research.company_intelligence.competitive_advantages.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Competitive Advantages</h6>
                        <div className="flex flex-wrap gap-2">
                          {research.company_intelligence.competitive_advantages.map((advantage: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                              {advantage}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pain Points */}
                    {research.company_intelligence.pain_points_addressed && research.company_intelligence.pain_points_addressed.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Pain Points Addressed</h6>
                        <div className="space-y-1">
                          {research.company_intelligence.pain_points_addressed.map((pain: string, index: number) => (
                            <p key={index} className="text-sm text-gray-900">• {pain}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Call to Actions */}
                    {research.company_intelligence.call_to_actions && research.company_intelligence.call_to_actions.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Call to Actions</h6>
                        <div className="flex flex-wrap gap-2">
                          {research.company_intelligence.call_to_actions.map((cta: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                              {cta}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}


                <div className="mt-4 text-xs text-gray-500">
                  Research started: {new Date(research.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
