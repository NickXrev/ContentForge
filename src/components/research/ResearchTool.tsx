'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Search, Globe, Building, Users, Target, Zap, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface ResearchData {
  id: string
  company_name: string
  website_url: string
  research_status: string
  created_at: string
  website_analysis?: {
    title: string
    description: string
    word_count: number
  }
  company_intelligence?: {
    business_type: string
    industry: string
    target_audience: string
    value_proposition: string
    key_services: string[]
    tone_of_voice: string
  }
}

export default function ResearchTool() {
  const [url, setUrl] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [researchData, setResearchData] = useState<ResearchData[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedResearch, setSelectedResearch] = useState<ResearchData | null>(null)

  useEffect(() => {
    loadResearchData()
  }, [])

  const loadResearchData = async () => {
    try {
      console.log('Loading research data...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's team
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (!teamMember) return

      // First get the basic research records
      const { data: researchRecords, error: researchError } = await supabase
        .from('company_research')
        .select('*')
        .eq('team_id', teamMember.team_id)
        .order('created_at', { ascending: false })

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
    }
  }

  const handleAnalyze = async () => {
    if (!url.trim() || !companyName.trim()) {
      setError('Please enter both company name and website URL')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to perform research')
        return
      }

      // Get user's team
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (!teamMember) {
        setError('You must be part of a team to perform research')
        return
      }

      const response = await fetch('/api/research/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          companyName: companyName.trim(),
          teamId: teamMember.team_id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze website')
      }

      setSuccess('Website analysis started! This may take a few moments.')
      setUrl('')
      setCompanyName('')
      
      // Reload research data
      setTimeout(() => {
        loadResearchData()
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze website')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Research Tool</h1>
        <p className="text-gray-600">Analyze websites and extract company intelligence for better AI content generation</p>
      </div>

      {/* Research Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Analyze New Company</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={loading || !url.trim() || !companyName.trim()}
          className="w-full md:w-auto"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Analyze Website
            </>
          )}
        </Button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
      </div>

      {/* Research Results */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Research Results</h2>
          <p className="text-sm text-gray-600">Your team's company research and analysis</p>
        </div>

        {researchData.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Research Yet</h3>
            <p className="text-gray-500">Start by analyzing a company website above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {researchData.map((research) => (
              <div key={research.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Building className="w-8 h-8 text-blue-500" />
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(research.research_status)}`}>
                    {getStatusIcon(research.research_status)}
                    <span className="ml-1 capitalize">{research.research_status.replace('_', ' ')}</span>
                  </span>
                </div>

                {/* Basic info always shown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Target className="w-4 h-4 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Industry</span>
                    </div>
                    <p className="text-sm text-gray-900">{research.company_intelligence?.industry || 'Not specified'}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Users className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Target Audience</span>
                    </div>
                    <p className="text-sm text-gray-900">{research.company_intelligence?.target_audience || 'Not specified'}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Zap className="w-4 h-4 text-purple-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Tone of Voice</span>
                    </div>
                    <p className="text-sm text-gray-900">{research.company_intelligence?.tone_of_voice || 'Not specified'}</p>
                  </div>
                </div>

                {/* Detailed view when selected */}
                {selectedResearch?.id === research.id && research.company_intelligence && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-6">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h5>
                    
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
                  Analyzed on {new Date(research.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
