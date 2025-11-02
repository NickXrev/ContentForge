'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, Target, Zap, TrendingUp, CheckCircle, ArrowRight, ArrowLeft, Search, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface OnboardingData {
  // Company Information
  companyName: string
  industry: string
  businessType: string
  companySize: string
  website: string
  
  // Target Audience
  targetAudience: string
  audiencePainPoints: string[]
  audienceGoals: string[]
  
  // Brand & Content
  brandTone: string
  contentGoals: string[]
  keyServices: string[]
  uniqueValueProp: string
  
  // SEO & Keywords
  seoKeywords: string[]
  competitorAnalysis: string
  contentPreferences: {
    preferredLength: string
    contentTypes: string[]
    postingFrequency: string
  }
}

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce', 
  'Marketing', 'Real Estate', 'Legal', 'Consulting', 'Manufacturing',
  'Retail', 'Food & Beverage', 'Travel', 'Entertainment', 'Other'
]

const businessTypes = [
  'B2B', 'B2C', 'SaaS', 'E-commerce', 'Service-based', 'Agency', 'Non-profit', 'Other'
]

const companySizes = [
  '1-10 employees', '11-50 employees', '51-200 employees', 
  '201-1000 employees', '1000+ employees'
]

const brandTones = [
  'Professional', 'Casual', 'Authoritative', 'Conversational', 
  'Friendly', 'Technical', 'Creative', 'Formal'
]

const contentGoals = [
  'Brand Awareness', 'Lead Generation', 'Thought Leadership', 
  'Customer Education', 'Product Promotion', 'Community Building'
]

const painPoints = [
  'Time Management', 'Cost Reduction', 'Efficiency', 'Growth', 
  'Competition', 'Technology Adoption', 'Customer Acquisition', 'Retention'
]

export default function ClientOnboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<OnboardingData>({
    companyName: '',
    industry: '',
    businessType: '',
    companySize: '',
    website: '',
    targetAudience: '',
    audiencePainPoints: [],
    audienceGoals: [],
    brandTone: 'professional',
    contentGoals: [],
    keyServices: [],
    uniqueValueProp: '',
    seoKeywords: [],
    competitorAnalysis: '',
    contentPreferences: {
      preferredLength: 'medium',
      contentTypes: [],
      postingFrequency: 'daily'
    }
  })
  const [tempKeywords, setTempKeywords] = useState('')
  const [tempGoals, setTempGoals] = useState('')
  const [tempServices, setTempServices] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [researchSuccess, setResearchSuccess] = useState(false)

  const steps = [
    { id: 'company', title: 'Company Info', icon: Building2 },
    { id: 'audience', title: 'Target Audience', icon: Users },
    { id: 'brand', title: 'Brand & Content', icon: Target },
    { id: 'seo', title: 'SEO & Strategy', icon: TrendingUp },
    { id: 'preferences', title: 'Content Preferences', icon: Zap }
  ]

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field as keyof OnboardingData] as string[]), value]
        : (prev[field as keyof OnboardingData] as string[]).filter(item => item !== value)
    }))
  }

  const handleKeywordsChange = (value: string) => {
    // Don't split immediately - let user type commas naturally
    setFormData(prev => ({
      ...prev,
      seoKeywords: value.split(',').map(k => k.trim()).filter(k => k)
    }))
  }

  const researchCompany = async () => {
    if (!formData.companyName.trim()) {
      setResearchError('Please enter a company name first')
      return
    }

    setIsResearching(true)
    setResearchError(null)

    try {
      const response = await fetch('/api/research/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyName: formData.companyName }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to research company')
      }

      if (result.success && result.data) {
        // Auto-populate the form with AI research
        setFormData(prev => ({
          ...prev,
          industry: result.data.industry,
          businessType: result.data.businessType,
          companySize: result.data.companySize,
          targetAudience: result.data.targetAudience,
          audiencePainPoints: result.data.audiencePainPoints,
          audienceGoals: result.data.audienceGoals,
          keyServices: result.data.keyServices,
          uniqueValueProp: result.data.uniqueValueProp,
          seoKeywords: result.data.seoKeywords,
          brandTone: result.data.brandTone,
          contentGoals: result.data.contentGoals
        }))

        // Update temp values for display
        setTempGoals(result.data.audienceGoals.join(', '))
        setTempServices(result.data.keyServices.join(', '))
        setTempKeywords(result.data.seoKeywords.join(', '))

        console.log('Company research completed:', result.data)
        
        // Show success message
        setResearchSuccess(true)
        setTimeout(() => {
          setResearchSuccess(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Company research error:', error)
      setResearchError(error instanceof Error ? error.message : 'Failed to research company')
    } finally {
      setIsResearching(false)
    }
  }

  const nextStep = async () => {
    if (currentStep < steps.length - 1) {
      // If we're on step 1 (company info) and have company name + website, do AI research
      if (currentStep === 0 && formData.companyName.trim() && formData.website.trim()) {
        await researchCompany()
      }
      
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user ID from public.users table
      // Get or create user in public.users table
      let userData
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (userError || !existingUser) {
        // User doesn't exist in public.users, create them
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'User'
          })
          .select('id')
          .single()

        if (createError || !newUser) {
          throw new Error('Failed to create user profile')
        }
        userData = newUser
      } else {
        userData = existingUser
      }

      // Check if user already has a team, if not create one
      let teamData
      const { data: existingTeam, error: teamCheckError } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', userData.id)
        .single()

      if (teamCheckError || !existingTeam) {
        // No team exists, create one
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: `${formData.companyName} Team`,
            description: `Team for ${formData.companyName}`,
            owner_id: userData.id
          })
          .select('id')
          .single()

        if (teamError || !newTeam) {
          throw new Error('Failed to create team')
        }
        teamData = newTeam
      } else {
        // Use existing team
        teamData = existingTeam
      }

      // Check if client profile already exists for this team
      // If multiple exist, get the most recent one
      const { data: existingProfiles, error: checkError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      const existingProfile = existingProfiles && existingProfiles.length > 0 ? existingProfiles[0] : null

      let error
      
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('client_profiles')
          .update({
            name: formData.companyName,
            company_name: formData.companyName, // Support both field names
            industry: formData.industry,
            business_type: formData.businessType,
            company_size: formData.companySize,
            website: formData.website,
            target_audience: formData.targetAudience,
            audience_pain_points: formData.audiencePainPoints,
            audience_goals: formData.audienceGoals,
            brand_voice: formData.brandTone,
            brand_tone: formData.brandTone, // Support both field names
            content_goals: formData.contentGoals,
            goals: formData.contentGoals, // Support both field names
            key_services: formData.keyServices,
            unique_value_prop: formData.uniqueValueProp,
            seo_keywords: formData.seoKeywords,
            competitor_analysis: formData.competitorAnalysis ? { notes: formData.competitorAnalysis } : {},
            competitors: formData.competitorAnalysis ? [formData.competitorAnalysis] : [],
            content_preferences: formData.contentPreferences,
            auth_id: user.id,
            user_id: userData.id
          })
          .eq('id', existingProfile.id)
        
        error = updateError
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from('client_profiles')
          .insert({
            team_id: teamData.id,
            auth_id: user.id,
            user_id: userData.id,
            name: formData.companyName,
            company_name: formData.companyName, // Support both field names
            industry: formData.industry,
            business_type: formData.businessType,
            company_size: formData.companySize,
            website: formData.website,
            target_audience: formData.targetAudience,
            audience_pain_points: formData.audiencePainPoints,
            audience_goals: formData.audienceGoals,
            brand_voice: formData.brandTone,
            brand_tone: formData.brandTone, // Support both field names
            content_goals: formData.contentGoals,
            goals: formData.contentGoals, // Support both field names
            key_services: formData.keyServices,
            unique_value_prop: formData.uniqueValueProp,
            seo_keywords: formData.seoKeywords,
            competitor_analysis: formData.competitorAnalysis ? { notes: formData.competitorAnalysis } : {},
            competitors: formData.competitorAnalysis ? [formData.competitorAnalysis] : [],
            content_preferences: formData.contentPreferences
          })
        
        error = insertError
      }

      if (error) {
        console.error('Database error details:', {
          error,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        // If table doesn't exist, show helpful message
        if (error.code === '42P01') {
          throw new Error('Database not set up yet. Please run the client-intelligence-minimal.sql file in Supabase first.')
        }
        throw new Error(`Database error: ${error.message || JSON.stringify(error)}`)
      }

      setCompleted(true)
    } catch (error) {
      console.error('Error saving client profile:', {
        error,
        message: error.message,
        stack: error.stack
      })
      alert(`Error saving profile: ${error.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Complete!</h2>
          <p className="text-gray-600 mb-6">
            Your client profile has been saved. You can now access smart content suggestions in The Forge.
          </p>
          <button
            onClick={() => window.location.href = '/content-studio'}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to The Forge
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ContentForge</h1>
          <p className="text-gray-600">Let's set up your profile to provide personalized content suggestions</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === index
              const isCompleted = currentStep > index
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center space-x-2 ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-blue-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-sm font-medium hidden sm:block">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-lg shadow-sm border p-6"
        >
          {/* Step 1: Company Information */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Company Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select your industry</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type *
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select business type</option>
                    {businessTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Size
                  </label>
                  <select
                    value={formData.companySize}
                    onChange={(e) => handleInputChange('companySize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select company size</option>
                    {companySizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website *
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Research Animation */}
          {currentStep === 1 && isResearching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <Search className="w-12 h-12 animate-pulse" />
                    <Loader2 className="w-6 h-6 animate-spin absolute -top-1 -right-1" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4">Researching Your Company</h3>
                <p className="text-blue-100 mb-6">
                  Our AI is analyzing {formData.companyName} to understand your business, industry, and target audience...
                </p>
                <div className="space-y-2 text-sm text-blue-200">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>Analyzing company profile</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span>Identifying target audience</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span>Researching competitors</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    <span>Finding relevant keywords</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Research Success Message */}
          {currentStep === 1 && researchSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-800 mb-2">Research Complete!</h3>
                <p className="text-green-700">
                  We've analyzed {formData.companyName} and pre-filled your profile. Review and adjust the information below.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Target Audience */}
          {currentStep === 1 && !isResearching && !researchSuccess && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Target Audience</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who is your target audience? *
                </label>
                <textarea
                  value={formData.targetAudience}
                  onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                  placeholder="Describe your ideal customer in detail..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What are their main pain points?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {painPoints.map(painPoint => (
                    <label key={painPoint} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.audiencePainPoints.includes(painPoint)}
                        onChange={(e) => handleArrayChange('audiencePainPoints', painPoint, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{painPoint}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What are their main goals?
                </label>
                <textarea
                  value={tempGoals || formData.audienceGoals.join(', ')}
                  onChange={(e) => setTempGoals(e.target.value)}
                  onBlur={(e) => {
                    const goals = e.target.value.split(',').map(g => g.trim()).filter(g => g)
                    handleInputChange('audienceGoals', goals)
                    setTempGoals('')
                  }}
                  placeholder="e.g., Increase efficiency, Reduce costs, Grow revenue..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 3: Brand & Content */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Brand & Content Strategy</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Tone *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {brandTones.map(tone => (
                    <label key={tone} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="brandTone"
                        value={tone.toLowerCase()}
                        checked={formData.brandTone === tone.toLowerCase()}
                        onChange={(e) => handleInputChange('brandTone', e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{tone}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Goals
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {contentGoals.map(goal => (
                    <label key={goal} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.contentGoals.includes(goal)}
                        onChange={(e) => handleArrayChange('contentGoals', goal, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{goal}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Services/Products
                </label>
                <textarea
                  value={tempServices || formData.keyServices.join(', ')}
                  onChange={(e) => setTempServices(e.target.value)}
                  onBlur={(e) => {
                    const services = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    handleInputChange('keyServices', services)
                    setTempServices('')
                  }}
                  placeholder="List your main services or products..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unique Value Proposition
                </label>
                <textarea
                  value={formData.uniqueValueProp}
                  onChange={(e) => handleInputChange('uniqueValueProp', e.target.value)}
                  placeholder="What makes you different from competitors?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 4: SEO & Strategy */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">SEO & Content Strategy</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Keywords (comma-separated)
                </label>
                <textarea
                  value={tempKeywords || formData.seoKeywords.join(', ')}
                  onChange={(e) => setTempKeywords(e.target.value)}
                  onBlur={(e) => {
                    const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k)
                    handleInputChange('seoKeywords', keywords)
                    setTempKeywords('')
                  }}
                  placeholder="e.g., digital marketing, business growth, productivity tools..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  These keywords will be used to suggest relevant content topics
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competitor Analysis Notes
                </label>
                <textarea
                  value={formData.competitorAnalysis}
                  onChange={(e) => handleInputChange('competitorAnalysis', e.target.value)}
                  placeholder="What do you know about your main competitors? What content do they create?"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 5: Content Preferences */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Content Preferences</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Content Length
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'short', label: 'Short (500-1000 words)' },
                    { value: 'medium', label: 'Medium (1000-2500 words)' },
                    { value: 'long', label: 'Long (2500+ words)' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="preferredLength"
                        value={option.value}
                        checked={formData.contentPreferences.preferredLength === option.value}
                        onChange={(e) => handleInputChange('contentPreferences', {
                          ...formData.contentPreferences,
                          preferredLength: e.target.value
                        })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Types
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    'Blog Posts', 'Social Media', 'Case Studies', 'White Papers',
                    'Video Scripts', 'Email Campaigns', 'Webinars', 'Infographics'
                  ].map(type => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.contentPreferences.contentTypes.includes(type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...formData.contentPreferences.contentTypes, type]
                            : formData.contentPreferences.contentTypes.filter(t => t !== type)
                          handleInputChange('contentPreferences', {
                            ...formData.contentPreferences,
                            contentTypes: newTypes
                          })
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posting Frequency
                </label>
                <select
                  value={formData.contentPreferences.postingFrequency}
                  onChange={(e) => handleInputChange('contentPreferences', {
                    ...formData.contentPreferences,
                    postingFrequency: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={nextStep}
                disabled={isResearching || (currentStep === 0 && (!formData.companyName.trim() || !formData.website.trim()))}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isResearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Researching...</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Setup</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
