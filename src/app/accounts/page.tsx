'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ExternalLink, Trash2, CheckCircle, AlertCircle, User, Edit3, Building2, Target, MessageSquare, Lightbulb, Shield, Search, TrendingUp, Globe, Users, FileText } from 'lucide-react'

interface SocialAccount {
  id: string
  platform: string
  username: string
  email: string
  profile_picture_url: string
  is_active: boolean
  connected_at: string
}

interface ClientProfile {
  id: string
  name: string
  industry: string
  target_audience: string
  brand_voice: string
  competitors: string[]
  goals: string[]
  created_at: string
  updated_at: string
}

interface Team {
  id: string
  name: string
  created_at: string
  has_profile: boolean
  profile_name?: string
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
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'social' | 'profile'>('social')
  const [isResearching, setIsResearching] = useState(false)
  const [forgeMessage, setForgeMessage] = useState(0)
  const [researchData, setResearchData] = useState<any>(null)
  const [showFullReport, setShowFullReport] = useState(false)

  // Forge messages that cycle during research
  const forgeMessages = [
    "Heating up the data, hammering insights into shape...",
    "Stoking the research furnace with fresh intelligence...",
    "Forging connections between market trends and opportunities...",
    "Tempering the data in the fires of deep analysis...",
    "Crafting competitive intelligence with precision...",
    "Molding raw information into strategic gold...",
    "Quenching the research in the waters of market reality...",
    "Polishing the insights to a brilliant shine...",
    "Testing the mettle of our research findings...",
    "Sharpening the competitive edge with fresh data...",
    "Welding together industry insights and opportunities...",
    "Refining the research through the forge of analysis...",
    "Casting new light on market dynamics...",
    "Hammering out the details of competitive positioning...",
    "Tempering insights with the heat of real-time data..."
  ]
  const searchParams = useSearchParams()

  // Check for OAuth success/error messages
  const success = searchParams.get('success')
  const oauthError = searchParams.get('error')

  const fetchTeamData = async (teamId: string) => {
    try {
      // Fetch social accounts for this team
      const { data: accountsData, error: accountsError } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError)
        setError('Failed to load accounts')
        return
      }

      setAccounts(accountsData || [])

      // Fetch client profile
      const { data: profileData, error: profileError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('team_id', teamId)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching client profile:', profileError)
        // Don't set error for missing profile, just leave it null
      } else {
        setClientProfile(profileData)
        
        // Fetch existing research data for this client profile
        if (profileData) {
          const { data: researchData, error: researchError } = await supabase
            .from('research_data')
            .select('research_data, research_type')
            .eq('client_profile_id', profileData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (researchError && researchError.code !== 'PGRST116') {
            console.error('Error fetching research data:', researchError)
          } else if (researchData) {
            setResearchData(researchData.research_data)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching team data:', err)
    }
  }

  const handleTeamChange = async (teamId: string) => {
    setSelectedTeamId(teamId)
    setTeamId(teamId)
    await fetchTeamData(teamId)
  }

  const handleResearchCompany = async () => {
    if (!clientProfile || !teamId) return

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    try {
      setIsResearching(true)
      setError(null)
      setForgeMessage(0)

      // Start cycling through forge messages with consistent timing
      let messageIndex = 0
      
      const cycleMessage = () => {
        messageIndex = (messageIndex + 1) % forgeMessages.length
        setForgeMessage(messageIndex)
        // Random timing between 8-15 seconds
        const randomDelay = Math.random() * 7000 + 8000 // 8000-15000ms
        timeoutId = setTimeout(cycleMessage, randomDelay)
      }
      
      // Start the first cycle
      const firstDelay = Math.random() * 7000 + 8000
      timeoutId = setTimeout(cycleMessage, firstDelay)

      const response = await fetch('/api/research/perplexity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: clientProfile.name,
          website: researchData?.websiteAnalysis?.domain,
          teamId: teamId,
          clientProfileId: clientProfile.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Research failed: ${errorData.error || 'Unknown error'}`)
      }

      const result = await response.json()
      
      // Add research type to the data
      const researchDataWithType = {
        ...result.data,
        researchType: result.researchType || 'unknown'
      }
      setResearchData(researchDataWithType)
      
      // Show the result
      if (result.researchType === 'openrouter' && result.perplexityError) {
        alert(`⚠️ Perplexity failed: ${result.perplexityError}\n\n✅ Research completed using: ${result.researchType}`)
      } else {
        alert(`✅ Research completed using: ${result.researchType || 'unknown'}`)
      }
    } catch (err) {
      console.error('Research error:', err)
      setError('Failed to research company. Please try again.')
    } finally {
      setIsResearching(false)
      // Clear the message cycling timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Please log in to view your accounts')
        return
      }

      // Get user from public.users table first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      console.log('User lookup:', { userData, userError, authUserId: user.id })

      let userId = user.id
      if (userError || !userData) {
        console.warn('User not found in public.users, trying direct team lookup with auth ID')
        // If user not found in public.users, try using auth user ID directly
        // This handles cases where the IDs don't match
      } else {
        userId = userData.id
      }

      // Get all user's teams with profile info
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          created_at,
          client_profiles!left(id, name)
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      console.log('Teams lookup:', { teamsData, teamsError, userId })

      if (teamsError || !teamsData || teamsData.length === 0) {
        setError('No teams found. Please complete your profile setup first.')
        return
      }

      // Process teams data
      const processedTeams: Team[] = teamsData.map(team => ({
        id: team.id,
        name: team.name,
        created_at: team.created_at,
        has_profile: team.client_profiles && team.client_profiles.length > 0,
        profile_name: team.client_profiles?.[0]?.name
      }))

      setTeams(processedTeams)
      
      // Select the first team by default (most recent)
      const firstTeam = teamsData[0]
      setSelectedTeamId(firstTeam.id)
      setTeamId(firstTeam.id)

      // Fetch data for the selected team
      await fetchTeamData(firstTeam.id)
    } catch (err) {
      console.error('Error in fetchData:', err)
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

      // Refresh data
      await fetchData()
    } catch (err) {
      console.error('Error disconnecting account:', err)
      setError('Failed to disconnect account')
    }
  }

  useEffect(() => {
    fetchData()
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

  if (isResearching) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center max-w-md mx-auto">
          {/* Forge Animation */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-b from-orange-400 to-red-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-orange-500 rounded-full animate-bounce"></div>
              </div>
            </div>
            {/* Sparks */}
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping delay-300"></div>
            <div className="absolute top-4 -left-4 w-2 h-2 bg-orange-400 rounded-full animate-ping delay-700"></div>
          </div>
          
          {/* Forge Text */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">🔥 Forging Intelligence</h2>
          <p className="text-gray-600 mb-4 transition-all duration-500 ease-in-out">
            {forgeMessages[forgeMessage]}
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-gradient-to-r from-orange-400 to-red-600 h-2 rounded-full animate-pulse"></div>
          </div>
          
          <p className="text-sm text-gray-500">Deep research in progress - this may take 2-5 minutes</p>
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
            onClick={fetchData}
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
          <h1 className="text-2xl font-bold text-gray-900" style={{ color: '#111827' }}>Accounts & Settings</h1>
          <p className="text-gray-600 mt-1" style={{ color: '#4B5563' }}>Manage your social accounts and client profile</p>
        </div>
        
        {/* Team Selector */}
        {teams.length > 1 && (
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">Team:</label>
            <select
              value={selectedTeamId || ''}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} {team.has_profile ? `(${team.profile_name})` : '(No Profile)'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('social')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'social'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ExternalLink className="w-4 h-4 inline mr-2" />
            Social Accounts
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Client Profile
          </button>
        </nav>
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
        {activeTab === 'social' ? (
          <>
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
          </>
        ) : (
          /* Client Profile Tab */
          <div className="max-w-4xl">
            {clientProfile ? (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-600 text-white p-3 rounded-lg">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{clientProfile.name}</h2>
                        <p className="text-gray-600">{clientProfile.industry} Industry</p>
                        {researchData && (
                          <p className="text-sm text-green-600 flex items-center mt-1">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Enhanced with AI Research
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={handleResearchCompany}
                        disabled={isResearching}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                      >
                        <Search className="w-4 h-4" />
                        <span>{isResearching ? 'Deep Research in Progress... (1-2 min)' : 'Research Company'}</span>
                      </button>
                      <button className="text-blue-600 hover:text-blue-700 transition-colors">
                        <Edit3 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Profile Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Target Audience */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Target className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">Target Audience</h3>
                    </div>
                    <p className="text-gray-700">{clientProfile.target_audience}</p>
                  </div>

                  {/* Brand Voice */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">Brand Voice</h3>
                    </div>
                    <p className="text-gray-700 capitalize">{clientProfile.brand_voice}</p>
                  </div>

                  {/* Content Goals */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                      <h3 className="font-semibold text-gray-900">Content Goals</h3>
                    </div>
                    <div className="space-y-2">
                      {clientProfile.goals.map((goal, index) => (
                        <span key={index} className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full mr-2 mb-2">
                          {goal}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Competitors */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Shield className="w-5 h-5 text-red-600" />
                      <h3 className="font-semibold text-gray-900">Competitors</h3>
                    </div>
                    <div className="space-y-2">
                      {clientProfile.competitors.length > 0 ? (
                        clientProfile.competitors.map((competitor, index) => (
                          <span key={index} className="inline-block bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full mr-2 mb-2">
                            {competitor}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No competitors specified</p>
                      )}
                      
                      {/* Full Report Display */}
                      {showFullReport && (researchData.fullReport || researchData.reprocessedData?.fullReport) && (
                        <div className="bg-white rounded-lg p-6 border border-green-100 mt-6">
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-blue-600" />
                            Comprehensive Research Report
                          </h4>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                              {researchData.fullReport || researchData.reprocessedData?.fullReport}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Research Data Section */}
                {researchData && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-900">AI Research Insights</h3>
                      </div>
                      {researchData.researchType && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                          Powered by {researchData.researchType}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      {/* Company Overview */}
                      <div className="bg-white rounded-lg p-6 border border-green-100">
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                          <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
                          Company Overview
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium text-gray-700">Industry:</span>
                            <p className="text-gray-600 mt-1">{researchData.companyOverview?.industry || researchData.industry || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Business Type:</span>
                            <p className="text-gray-600 mt-1">{researchData.companyOverview?.businessType || researchData.businessType || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Company Size:</span>
                            <p className="text-gray-600 mt-1">{researchData.companyOverview?.companySize || researchData.companySize || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Brand Tone:</span>
                            <p className="text-gray-600 mt-1 capitalize">{researchData.companyOverview?.brandTone || researchData.brandTone || 'Not specified'}</p>
                          </div>
                        </div>
                        {(researchData.companyOverview?.uniqueValueProp || researchData.uniqueValueProp) && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-700">Value Proposition:</span>
                            <p className="text-gray-600 text-sm mt-1">{researchData.companyOverview?.uniqueValueProp || researchData.uniqueValueProp}</p>
                          </div>
                        )}
                      </div>

                      {/* Target Audience & Market Analysis */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg p-6 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <Target className="w-5 h-5 mr-2 text-green-600" />
                            Target Audience
                          </h4>
                          <p className="text-gray-600 text-sm">{researchData.targetAudience?.targetAudience || researchData.targetAudience || 'Not specified'}</p>
                          
                          {(researchData.targetAudience?.audienceGoals || researchData.audienceGoals) && (researchData.targetAudience?.audienceGoals || researchData.audienceGoals).length > 0 && (
                            <div className="mt-4">
                              <span className="font-medium text-gray-700 text-sm">Audience Goals:</span>
                              <div className="mt-2 space-y-1">
                                {(researchData.targetAudience?.audienceGoals || researchData.audienceGoals).slice(0, 3).map((goal: string, index: number) => (
                                  <p key={index} className="text-gray-600 text-xs">• {goal}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {(researchData.targetAudience?.audiencePainPoints || researchData.audiencePainPoints) && (researchData.targetAudience?.audiencePainPoints || researchData.audiencePainPoints).length > 0 && (
                            <div className="mt-4">
                              <span className="font-medium text-gray-700 text-sm">Pain Points:</span>
                              <div className="mt-2 space-y-1">
                                {(researchData.targetAudience?.audiencePainPoints || researchData.audiencePainPoints).slice(0, 3).map((pain: string, index: number) => (
                                  <p key={index} className="text-gray-600 text-xs">• {pain}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-white rounded-lg p-6 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                            Market Trends
                          </h4>
                          {(researchData.marketTrends?.marketTrends || researchData.marketTrends) && (researchData.marketTrends?.marketTrends || researchData.marketTrends).length > 0 ? (
                            <div className="space-y-2">
                              {(researchData.marketTrends?.marketTrends || researchData.marketTrends).slice(0, 3).map((trend: string, index: number) => (
                                <p key={index} className="text-gray-600 text-sm">• {trend}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm italic">No market trends available</p>
                          )}
                          
                          {(researchData.marketTrends?.opportunities || researchData.opportunities) && (researchData.marketTrends?.opportunities || researchData.opportunities).length > 0 && (
                            <div className="mt-4">
                              <span className="font-medium text-gray-700 text-sm">Opportunities:</span>
                              <div className="mt-2 space-y-1">
                                {(researchData.marketTrends?.opportunities || researchData.opportunities).slice(0, 2).map((opp: string, index: number) => (
                                  <p key={index} className="text-gray-600 text-xs">• {opp}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Key Services & Competitors */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg p-6 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                            Key Services
                          </h4>
                          {researchData.keyServices && researchData.keyServices.length > 0 ? (
                            <div className="space-y-2">
                              {researchData.keyServices.slice(0, 5).map((service, index) => (
                                <span key={index} className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mr-2 mb-2">
                                  {service}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm italic">No services identified</p>
                          )}
                        </div>

                        <div className="bg-white rounded-lg p-6 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-red-600" />
                            Competitors
                          </h4>
                          {(researchData.competitors?.competitors || researchData.competitors) && (researchData.competitors?.competitors || researchData.competitors).length > 0 ? (
                            <div className="space-y-2">
                              {(researchData.competitors?.competitors || researchData.competitors).slice(0, 5).map((competitor, index) => (
                                <span key={index} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-2 mb-2">
                                  {competitor}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm italic">No competitors identified</p>
                          )}
                          
                          {(researchData.competitors?.competitiveAdvantages || researchData.competitiveAdvantages) && (researchData.competitors?.competitiveAdvantages || researchData.competitiveAdvantages).length > 0 && (
                            <div className="mt-4">
                              <span className="font-medium text-gray-700 text-sm">Competitive Advantages:</span>
                              <div className="mt-2 space-y-1">
                                {(researchData.competitors?.competitiveAdvantages || researchData.competitiveAdvantages).slice(0, 3).map((adv, index) => (
                                  <p key={index} className="text-gray-600 text-xs">• {adv}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SEO Keywords & Recent News */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg p-6 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <Search className="w-5 h-5 mr-2 text-purple-600" />
                            SEO Keywords
                          </h4>
                          {(researchData.seoKeywords?.seoKeywords || researchData.seoKeywords) && (researchData.seoKeywords?.seoKeywords || researchData.seoKeywords).length > 0 ? (
                            <div className="space-y-2">
                              {(researchData.seoKeywords?.seoKeywords || researchData.seoKeywords).slice(0, 8).map((keyword, index) => (
                                <span key={index} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-2 mb-2">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm italic">No keywords identified</p>
                          )}
                        </div>

                        <div className="bg-white rounded-lg p-6 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <Globe className="w-5 h-5 mr-2 text-indigo-600" />
                            Recent News
                          </h4>
                          {researchData.recentNews && researchData.recentNews.length > 0 ? (
                            <div className="space-y-2">
                              {researchData.recentNews.slice(0, 3).map((news, index) => (
                                <p key={index} className="text-gray-600 text-sm">• {news}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm italic">No recent news available</p>
                          )}
                        </div>
                      </div>

                      {/* Full Report Access */}
                      {(researchData.fullReport || researchData.reprocessedData?.fullReport) && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-blue-600" />
                            Comprehensive Research Report
                          </h4>
                          <p className="text-gray-600 text-sm mb-4">
                            Access the full 10,000-word analysis with detailed industry insights, competitive analysis, and strategic recommendations.
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              {researchData.citations && researchData.citations.length > 0 && (
                                <span>{researchData.citations.length} sources cited</span>
                              )}
                            </div>
                            <button 
                              onClick={() => setShowFullReport(!showFullReport)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              {showFullReport ? 'Hide Full Report' : 'View Full Report'} →
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Target Audience & Pain Points */}
                      {(researchData.targetAudience || (researchData.audiencePainPoints && researchData.audiencePainPoints.length > 0)) && (
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-blue-600" />
                            Target Audience
                          </h4>
                          {researchData.targetAudience && (
                            <p className="text-sm text-gray-600 mb-3">{researchData.targetAudience}</p>
                          )}
                          {researchData.audiencePainPoints && researchData.audiencePainPoints.length > 0 && (
                            <div>
                              <h5 className="font-medium text-gray-800 mb-1 text-xs">Pain Points</h5>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {researchData.audiencePainPoints.slice(0, 3).map((pain: string, index: number) => (
                                  <li key={index} className="flex items-start">
                                    <span className="w-1 h-1 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {pain}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Goals & Services */}
                      {(researchData.audienceGoals && researchData.audienceGoals.length > 0) || (researchData.keyServices && researchData.keyServices.length > 0) ? (
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                          {researchData.audienceGoals && researchData.audienceGoals.length > 0 && (
                            <div className="mb-3">
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                <Target className="w-4 h-4 mr-2 text-green-600" />
                                Audience Goals
                              </h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {researchData.audienceGoals.slice(0, 3).map((goal: string, index: number) => (
                                  <li key={index} className="flex items-start">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {goal}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {researchData.keyServices && researchData.keyServices.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                <MessageSquare className="w-4 h-4 mr-2 text-blue-600" />
                                Key Services
                              </h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {researchData.keyServices.slice(0, 3).map((service: string, index: number) => (
                                  <li key={index} className="flex items-start">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {service}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Recent News */}
                      {researchData.recentNews && researchData.recentNews.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Globe className="w-4 h-4 mr-2 text-blue-600" />
                            Recent News
                          </h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {researchData.recentNews.slice(0, 3).map((news: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {news}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Market Trends */}
                      {researchData.marketTrends && researchData.marketTrends.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                            Market Trends
                          </h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {researchData.marketTrends.slice(0, 3).map((trend: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {trend}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Social Media Presence */}
                      {researchData.socialMediaPresence && (
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-pink-600" />
                            Social Media
                          </h4>
                          <div className="text-sm text-gray-600">
                            <p><strong>Platforms:</strong> {researchData.socialMediaPresence.platforms?.join(', ') || 'Not available'}</p>
                            <p><strong>Engagement:</strong> {researchData.socialMediaPresence.engagement}</p>
                            <p><strong>Followers:</strong> {researchData.socialMediaPresence.followers}</p>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Competitors */}
                      {researchData.competitors && researchData.competitors.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-red-600" />
                            Competitors
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {researchData.competitors.slice(0, 5).map((competitor: string, index: number) => (
                              <span key={index} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                {competitor}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Enhanced Keywords */}
                      {researchData.seoKeywords && researchData.seoKeywords.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Target className="w-4 h-4 mr-2 text-yellow-600" />
                            SEO Keywords
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {researchData.seoKeywords.slice(0, 6).map((keyword: string, index: number) => (
                              <span key={index} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Website Analysis */}
                      {researchData.websiteAnalysis && (
                        <div className="bg-white rounded-lg p-4 border border-green-100">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Globe className="w-4 h-4 mr-2 text-indigo-600" />
                            Website Analysis
                          </h4>
                          <div className="text-sm text-gray-600">
                            <p><strong>Domain:</strong> {researchData.websiteAnalysis.domain}</p>
                            <p><strong>Description:</strong> {researchData.websiteAnalysis.description}</p>
                            {researchData.websiteAnalysis.keyFeatures && (
                              <div className="mt-2">
                                <p className="font-medium">Key Features:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {researchData.websiteAnalysis.keyFeatures.map((feature: string, index: number) => (
                                    <li key={index}>{feature}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Profile Actions */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Profile Management</h3>
                      <p className="text-gray-600 text-sm">Last updated {new Date(clientProfile.updated_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex space-x-3">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Edit Profile
                      </button>
                      <button 
                        onClick={() => window.location.href = '/onboarding'}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Complete Setup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* No Profile State */
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👤</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Client Profile Found</h3>
                <p className="text-gray-600 mb-6">Complete your client onboarding to set up your profile and start creating content</p>
                <button 
                  onClick={() => window.location.href = '/onboarding'}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Complete Onboarding
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}