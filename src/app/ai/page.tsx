'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ContentGenerator } from '@/components/ai/ContentGenerator'
import { ClientProfileSetup } from '@/components/ai/ClientProfileSetup'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { simpleAnalytics } from '@/lib/simple-analytics'
import { Brain, Settings, Zap, FileText } from 'lucide-react'

export default function AIPage() {
  const { user } = useAuth()
  const [clientProfile, setClientProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfileSetup, setShowProfileSetup] = useState(false)

  useEffect(() => {
    if (user) {
      fetchClientProfile()
    }
    // Track page view
    simpleAnalytics.trackPageView('/ai')
  }, [user])

  const fetchClientProfile = async () => {
    if (!user) return

    try {
      // Get user's team
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)

      if (teams?.[0]?.id) {
        // Get client profile for the team
        // If multiple exist, get the most recent one
        const { data: profiles } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('team_id', teams[0].id)
          .order('created_at', { ascending: false })
          .limit(1)

        const profile = profiles && profiles.length > 0 ? profiles[0] : null
        setClientProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching client profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileComplete = (profile: any) => {
    setClientProfile(profile)
    setShowProfileSetup(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">AI Content Studio</h1>
            </div>
            <div className="flex items-center space-x-4">
              {clientProfile && (
                <button
                  onClick={() => setShowProfileSetup(true)}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showProfileSetup ? (
          <ClientProfileSetup onComplete={handleProfileComplete} />
        ) : clientProfile ? (
          <ContentGenerator clientProfile={clientProfile} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="bg-white rounded-lg shadow-lg p-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-blue-600" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to AI Content Studio
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Set up your client profile to get started with AI-powered content generation. 
                This helps our AI understand your brand and create more relevant content.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 border border-gray-200 rounded-lg">
                  <Zap className="w-8 h-8 text-blue-600 mb-4 mx-auto" />
                  <h3 className="font-semibold text-gray-900 mb-2">AI Content Generation</h3>
                  <p className="text-gray-600 text-sm">
                    Generate content tailored to your brand voice and audience
                  </p>
                </div>
                
                <div className="p-6 border border-gray-200 rounded-lg">
                  <FileText className="w-8 h-8 text-green-600 mb-4 mx-auto" />
                  <h3 className="font-semibold text-gray-900 mb-2">Multi-Platform</h3>
                  <p className="text-gray-600 text-sm">
                    Create content for LinkedIn, Twitter, Instagram, and more
                  </p>
                </div>
                
                <div className="p-6 border border-gray-200 rounded-lg">
                  <Settings className="w-8 h-8 text-purple-600 mb-4 mx-auto" />
                  <h3 className="font-semibold text-gray-900 mb-2">Brand-Aware</h3>
                  <p className="text-gray-600 text-sm">
                    Content that matches your industry and brand voice
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowProfileSetup(true)}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Set Up Client Profile
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
