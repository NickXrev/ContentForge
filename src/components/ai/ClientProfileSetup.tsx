'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { Building2, Users, Target, Mic, TrendingUp, CheckCircle } from 'lucide-react'

interface ClientProfileSetupProps {
  onComplete?: (profile: any) => void
}

export function ClientProfileSetup({ onComplete }: ClientProfileSetupProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [profile, setProfile] = useState({
    name: '',
    industry: '',
    target_audience: '',
    brand_voice: '',
    competitors: [] as string[],
    goals: [] as string[]
  })
  const [goalsText, setGoalsText] = useState('')
  const [competitorsText, setCompetitorsText] = useState('')

  const steps = [
    { id: 1, title: 'Basic Info', icon: Building2 },
    { id: 2, title: 'Audience', icon: Users },
    { id: 3, title: 'Brand Voice', icon: Mic },
    { id: 4, title: 'Competitors', icon: TrendingUp },
    { id: 5, title: 'Goals', icon: Target }
  ]

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to save your profile')
      return
    }

    setLoading(true)
    setError('')
    
    try {
        // First, create or get the user's team
        const { data: teams } = await supabase
          .from('teams')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)

        let teamId = teams?.[0]?.id

        if (!teamId) {
          const { data: newTeam, error: teamError } = await supabase
            .from('teams')
            .insert({
              name: `${profile.name} Team`,
              owner_id: user.id
            })
            .select('id')
            .single()

          if (teamError) {
            setError(`Error creating team: ${teamError.message}`)
            return
          }

          teamId = newTeam?.id

          // Add the user as an admin member of their own team
          if (teamId) {
            const { error: memberError } = await supabase
              .from('team_members')
              .insert({
                team_id: teamId,
                user_id: user.id,
                role: 'admin'
              })

            if (memberError) {
              console.warn('Could not add user as team member:', memberError.message)
              // Don't fail the whole process for this
            }
          }
        }

      if (teamId) {
        const { data: clientProfile, error: profileError } = await supabase
          .from('client_profiles')
          .insert({
            team_id: teamId,
            ...profile
          })
          .select()
          .single()

        if (profileError) {
          setError(`Error saving profile: ${profileError.message}`)
          return
        }

        if (clientProfile) {
          setSuccess(true)
          setTimeout(() => {
            onComplete?.(clientProfile)
          }, 1500)
        }
      }
    } catch (error) {
      setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company/Brand Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., TechCorp, My Startup, Personal Brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Select your industry</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Consulting">Consulting</option>
                <option value="Marketing">Marketing</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <textarea
                value={profile.target_audience}
                onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                rows={4}
                placeholder="Describe your ideal customer or audience. Be specific about demographics, interests, and pain points."
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Voice & Tone
              </label>
              <textarea
                value={profile.brand_voice}
                onChange={(e) => setProfile({ ...profile, brand_voice: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                rows={4}
                placeholder="How do you want your brand to sound? (e.g., Professional and authoritative, Friendly and approachable, Innovative and cutting-edge)"
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competitors
              </label>
              <textarea
                value={competitorsText}
                onChange={(e) => setCompetitorsText(e.target.value)}
                onBlur={() => {
                  // Process the competitors when user finishes typing
                  const competitors = competitorsText.split(',').map(s => s.trim()).filter(Boolean)
                  setProfile({ ...profile, competitors })
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                rows={3}
                placeholder="List your main competitors (separated by commas)"
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Goals
              </label>
              <textarea
                value={goalsText}
                onChange={(e) => setGoalsText(e.target.value)}
                onBlur={() => {
                  // Process the goals when user finishes typing
                  const goals = goalsText.split(',').map(s => s.trim()).filter(Boolean)
                  setProfile({ ...profile, goals })
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                rows={4}
                placeholder="What are your main business goals? (e.g., Increase brand awareness, Generate leads, Drive sales, Build community)"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Set Up Your Client Profile
          </h2>
          <p className="text-gray-600">
            Help AI understand your brand to create better content
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isActive 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStep()}
        </div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6"
          >
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Profile saved successfully! Redirecting to content generator...
            </div>
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

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={handlePrevious}
            variant="outline"
            disabled={currentStep === 1 || loading}
            className="text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Previous
          </Button>
          
          {currentStep < 5 ? (
            <Button onClick={handleNext} disabled={loading}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              loading={loading}
              disabled={success}
              className="bg-green-600 hover:bg-green-700"
            >
              {success ? 'Saved!' : 'Complete Setup'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
