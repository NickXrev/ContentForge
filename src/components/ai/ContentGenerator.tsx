'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { openRouter } from '@/lib/openrouter'
import { Zap, Copy, RefreshCw, Download, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { teamAnalytics } from '@/lib/team-analytics'

interface ContentGeneratorProps {
  clientProfile?: any
}

export function ContentGenerator({ clientProfile }: ContentGeneratorProps) {
  const { user } = useAuth()
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState<'linkedin' | 'twitter' | 'instagram' | 'blog' | 'facebook'>('linkedin')
  const [tone, setTone] = useState('professional')
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic for your content')
      return
    }

    // Track content generation attempt
    teamAnalytics.trackActivity('content_generation_started', {
      platform,
      tone,
      topic: topic.substring(0, 50) // Truncate for privacy
    })

    // Note: OpenRouter API key check is handled server-side

    setLoading(true)
    setError('')
    setGeneratedContent('')

    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          platform,
          tone,
          clientProfile
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }

      const { content } = await response.json()
      setGeneratedContent(content)
      
      // Track successful AI request
      teamAnalytics.trackAIRequest('openai/gpt-4o-mini')
      teamAnalytics.trackActivity('content_generation_success', {
        platform,
        content_length: content.length
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content')
      
      // Track error
      teamAnalytics.trackError(`Content generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'content_generation')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
    teamAnalytics.trackActivity('content_copied', { platform })
  }

  const handleRegenerate = () => {
    teamAnalytics.trackActivity('content_regenerated', { platform })
    handleGenerate()
  }

  const handleSave = async () => {
    if (!generatedContent.trim()) {
      setError('No content to save')
      return
    }

    if (!user) {
      setError('You must be logged in to save content')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Get the user's team
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)

      if (!teams || teams.length === 0) {
        setError('No team found. Please complete your client profile setup first.')
        return
      }

      const teamId = teams[0].id

      // Get AI model from admin config
      const { data: aiModelConfig } = await supabase
        .from('admin_configs')
        .select('value')
        .eq('key', 'ai_model')
        .single()

      const aiModel = aiModelConfig?.value || 'openai/gpt-4o-mini'

      // Save the content document with proper structure
      const { data: document, error: docError } = await supabase
        .from('content_documents')
        .insert({
          team_id: teamId,
          title: `${platform} content: ${topic}`,
          content: generatedContent,
          platform: platform,
          status: 'draft',
          topic: topic,
          tone: tone,
          target_audience: clientProfile?.target_audience || null,
          ai_model: aiModel,
          generation_prompt: `Create ${platform} content about: ${topic}`,
          generation_metadata: {
            client_profile: clientProfile,
            generated_at: new Date().toISOString(),
            platform_specific: true
          },
          created_by: user.id
        })
        .select()
        .single()

      if (docError) {
        setError(`Error saving content: ${docError.message}`)
        return
      }

      setSuccess('Content saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
      
      // Track content creation
      teamAnalytics.trackContentCreated(platform, topic)
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const platforms = [
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'twitter', label: 'Twitter', icon: '🐦' },
    { value: 'instagram', icon: '📸', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook', icon: '👥' },
    { value: 'blog', label: 'Blog Post', icon: '📝' }
  ]

  const tones = [
    'professional', 'casual', 'friendly', 'authoritative', 
    'conversational', 'inspirational', 'humorous'
  ]

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            AI Content Generator
          </h2>
          <p className="text-gray-600">
            Create engaging content tailored to your brand and audience
          </p>
        </div>

        {/* Input Form */}
        <div className="space-y-6 mb-8">
          {/* Topic Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to write about?
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., The future of remote work, 5 tips for productivity, Industry trends in 2024..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-500"
              rows={3}
            />
          </div>

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {platforms.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value as any)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    platform === p.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{p.icon}</div>
                  <div className="text-sm font-medium">{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {tones.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              loading={loading}
              disabled={!topic.trim()}
              size="lg"
              className="px-8 py-4"
            >
              <Zap className="w-5 h-5 mr-2" />
              Generate Content
            </Button>
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

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Generated Content */}
        {generatedContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 rounded-lg p-6 bg-gray-50"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Generated Content
              </h3>
              <div className="flex space-x-2">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleSave}
                  loading={saving}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-gray-800 font-sans">
                {generatedContent}
              </pre>
            </div>
          </motion.div>
        )}

        {/* Client Profile Info */}
        {clientProfile && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Using Client Profile:</h4>
            <p className="text-blue-800 text-sm">
              <strong>Industry:</strong> {clientProfile.industry} | 
              <strong> Audience:</strong> {clientProfile.target_audience} | 
              <strong> Voice:</strong> {clientProfile.brand_voice}
            </p>
          </div>
        )}

        {!clientProfile && (
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">No Client Profile Found</h4>
            <p className="text-yellow-800 text-sm">
              Set up your client profile to get more personalized content recommendations.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
