'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ExternalLink, Trash2, CheckCircle, AlertCircle } from 'lucide-react'

interface SocialAccount {
  id: string
  platform: string
  username: string
  email: string
  profile_picture_url: string
  is_active: boolean
  connected_at: string
}

const platformIcons = {
  linkedin: ExternalLink,
  twitter: ExternalLink,
  instagram: ExternalLink,
  facebook: ExternalLink,
  youtube: ExternalLink
}

const platformColors = {
  linkedin: 'bg-blue-600',
  twitter: 'bg-blue-400',
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-700',
  youtube: 'bg-red-600'
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Check for OAuth success/error messages
  const success = searchParams.get('success')
  const oauthError = searchParams.get('error')

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Please log in to view your accounts')
        return
      }

      // Get user's team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (teamError || !teamData) {
        setError('No team found. Please complete your profile setup first.')
        return
      }

      setTeamId(teamData.id)

      // Fetch social accounts for this team
      const { data: accountsData, error: accountsError } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('team_id', teamData.id)
        .eq('is_active', true)

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError)
        setError('Failed to load accounts')
        return
      }

      setAccounts(accountsData || [])
    } catch (err) {
      console.error('Error in fetchAccounts:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleConnectAccount = async (platform: string) => {
    if (!teamId) {
      setError('Team ID not found. Please refresh the page.')
      return
    }

    if (platform === 'linkedin') {
      // Redirect to LinkedIn OAuth
      window.location.href = `/api/auth/linkedin?teamId=${teamId}`
    } else {
      // For now, show coming soon for other platforms
      alert(`${platform.charAt(0).toUpperCase() + platform.slice(1)} integration coming soon!`)
    }
  }

  const handleDisconnectAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .eq('id', accountId)

      if (error) {
        console.error('Error disconnecting account:', error)
        setError('Failed to disconnect account')
        return
      }

      // Refresh accounts list
      await fetchAccounts()
    } catch (err) {
      console.error('Error disconnecting account:', err)
      setError('Failed to disconnect account')
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading accounts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Error loading accounts</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchAccounts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white text-gray-900" style={{ color: '#111827' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ color: '#111827' }}>Social Accounts</h1>
          <p className="text-gray-600 mt-1" style={{ color: '#4B5563' }}>Manage your connected social media accounts</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success === 'linkedin_connected' && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 mx-6 mt-4 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          LinkedIn account connected successfully!
        </div>
      )}

      {oauthError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 mx-6 mt-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          OAuth Error: {oauthError}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 text-gray-900">
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ color: '#111827' }}>No accounts connected</h3>
            <p className="text-gray-600 mb-6" style={{ color: '#4B5563' }}>Connect your social media accounts to start publishing content</p>
            
            <div className="flex flex-wrap justify-center gap-3">
              <button 
                onClick={() => handleConnectAccount('linkedin')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
              >
                <span>LinkedIn</span>
              </button>
              <button 
                onClick={() => handleConnectAccount('twitter')}
                className="bg-blue-400 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
              >
                <span>Twitter</span>
              </button>
              <button 
                onClick={() => handleConnectAccount('instagram')}
                className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
              >
                <span>Instagram</span>
              </button>
              <button 
                onClick={() => handleConnectAccount('facebook')}
                className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
              >
                <span>Facebook</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => {
              const Icon = platformIcons[account.platform as keyof typeof platformIcons] || ExternalLink
              const colorClass = platformColors[account.platform as keyof typeof platformColors] || 'bg-gray-600'
              
              return (
                <div key={account.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${colorClass} text-white p-2 rounded-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <button
                      onClick={() => handleDisconnectAccount(account.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 capitalize" style={{ color: '#111827' }}>
                      {account.platform}
                    </h3>
                    <p className="text-sm text-gray-600" style={{ color: '#4B5563' }}>
                      {account.username}
                    </p>
                    {account.email && (
                      <p className="text-xs text-gray-500" style={{ color: '#6B7280' }}>
                        {account.email}
                      </p>
                    )}
                    <p className="text-xs text-gray-400" style={{ color: '#9CA3AF' }}>
                      Connected {new Date(account.connected_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )
            })}
            
            {/* Add more accounts button */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center hover:border-gray-400 transition-colors">
              <button
                onClick={() => handleConnectAccount('linkedin')}
                className="text-gray-600 hover:text-gray-800 transition-colors text-center"
              >
                <div className="text-2xl mb-2">+</div>
                <div className="text-sm font-medium">Connect Account</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}