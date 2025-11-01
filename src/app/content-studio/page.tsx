'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Sparkles, Target, Users, Calendar, Save, Download, Share2, Edit3, Trash2, Clock, ChevronLeft, ChevronRight, TrendingUp, Lightbulb, Zap, ArrowRight, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CollaborativeEditor from '@/components/editor/CollaborativeEditor'
import { useClientIntelligence, ClientIntelligence, TrendingTopic } from '@/hooks/useClientIntelligence'

interface SocialPost {
  content: string
  imageUrl?: string
}

interface ContentPiece {
  id: string
  title: string
  topic: string
  targetAudience: string
  contentLength: 'short' | 'medium' | 'long'
  tone: 'professional' | 'casual' | 'authoritative' | 'conversational'
  keywords: string[]
  longFormContent: string
  socialContent: {
    twitter: SocialPost[]
    linkedin: SocialPost[]
    instagram: SocialPost[]
  }
  createdAt: string
  updatedAt: string
  status: 'draft' | 'ready' | 'published'
}

export default function ContentStudioPage() {
  const { clientData, trendingTopics, loading: intelligenceLoading } = useClientIntelligence()
  const [currentStep, setCurrentStep] = useState<'suggestions' | 'generating' | 'preview' | 'social'>('suggestions')
  const [stepHistory, setStepHistory] = useState<string[]>(['suggestions'])
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null)
  const [customTopic, setCustomTopic] = useState('')
  const [generatedContent, setGeneratedContent] = useState<ContentPiece | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [schedulingPost, setSchedulingPost] = useState<{platform: string, index: number} | null>(null)
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    platforms: [] as string[]
  })
  const [viewingPost, setViewingPost] = useState<{platform: string, index: number, content: string} | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [generatingImage, setGeneratingImage] = useState<{platform: string, index: number} | null>(null)

  const goToStep = (step: 'suggestions' | 'generating' | 'preview' | 'social') => {
    setCurrentStep(step)
    setStepHistory(prev => [...prev, step])
  }

  const goBack = () => {
    if (stepHistory.length > 1) {
      const newHistory = [...stepHistory]
      newHistory.pop() // Remove current step
      const previousStep = newHistory[newHistory.length - 1] as 'suggestions' | 'generating' | 'preview' | 'social'
      setCurrentStep(previousStep)
      setStepHistory(newHistory)
    }
  }

  const canGoBack = () => {
    return stepHistory.length > 1 && currentStep !== 'generating'
  }

  const canGoForward = () => {
    if (currentStep === 'suggestions') {
      return selectedTopic !== null || customTopic.trim() !== ''
    }
    if (currentStep === 'preview') {
      return generatedContent !== null
    }
    return false
  }

  const handleGenerate = async () => {
    const topic = selectedTopic || { topic: customTopic, keywords: [], content_angle: '', target_audience: clientData?.target_audience || 'your audience' }
    if (!topic.topic.trim()) return
    
    setIsGenerating(true)
    goToStep('generating')
    
    try {
      // Call real AI API for blog content
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.topic,
          platform: 'blog',
          tone: clientData?.brand_tone || 'professional',
          clientProfile: {
            name: clientData?.company_name,
            industry: clientData?.industry,
            target_audience: clientData?.target_audience,
            brand_voice: clientData?.brand_tone,
            competitors: [],
            goals: clientData?.content_goals || []
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }

      const { content: longFormContent } = await response.json()
    
      // Don't generate social posts here - wait until user clicks "Generate Social Posts"
      // Initialize with empty social content arrays
      const socialContent: { twitter: SocialPost[], linkedin: SocialPost[], instagram: SocialPost[] } = {
        twitter: [],
        linkedin: [],
        instagram: []
      }

      // Extract title from content (first line or H1)
      const titleMatch = longFormContent.match(/^#\s*(.+)$/m) || longFormContent.match(/^(.+)$/m)
      const title = titleMatch ? titleMatch[1].replace(/^#+\s*/, '') : `${topic.topic}: A ${clientData?.industry || 'Industry'} Guide`

      const generatedContentData: ContentPiece = {
        id: Date.now().toString(),
        title: title,
        topic: topic.topic,
        targetAudience: clientData?.target_audience || 'your target audience',
        contentLength: 'long',
        tone: (clientData?.brand_tone as 'professional' | 'casual' | 'authoritative' | 'conversational') || 'professional',
        keywords: topic.keywords || clientData?.seo_keywords || [],
        longFormContent: longFormContent,
        socialContent: socialContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft'
      }
      
      setGeneratedContent(generatedContentData)
      goToStep('preview')
    } catch (error) {
      console.error('Error generating content:', error)
      alert(`Error generating content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedContent) return
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user from public.users table first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (userError || !userData) {
        throw new Error('User not found in database')
      }

      // Get user's team
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (teamsError || !teamsData || teamsData.length === 0) {
        throw new Error('No team found. Please complete your profile setup first.')
      }

      const teamId = teamsData[0].id

      // Save main content document
      const { data: document, error: docError } = await supabase
        .from('content_documents')
        .insert({
          team_id: teamId,
          title: generatedContent.title,
          content: generatedContent.longFormContent,
          platform: 'blog',
          status: 'draft',
          topic: generatedContent.topic,
          created_by: user.id,
          metadata: {
            target_audience: generatedContent.targetAudience,
            tone: generatedContent.tone,
            keywords: generatedContent.keywords,
            content_length: generatedContent.contentLength,
            social_content: generatedContent.socialContent
          }
        })
        .select()
        .single()

      if (docError) {
        console.error('Database error:', docError)
        throw new Error(`Failed to save content: ${docError.message}`)
      }

      alert('Content saved successfully!')
    } catch (error) {
      console.error('Error saving content:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please try again.'
      alert(`Error saving content: ${errorMessage}`)
    }
  }

  const handleGenerateSocial = async () => {
    if (!generatedContent) return
    
    setIsGenerating(true)
    
    try {
      // Generate social media posts based on the current (potentially edited) long-form content
      // Extract key points from the long-form content to use as context
      const contentSummary = generatedContent.longFormContent.substring(0, 500) // Use first 500 chars as summary
      
      // Generate 3 unique posts per platform
      const platforms = ['twitter', 'linkedin', 'instagram']
      const postsPerPlatform = 3
      const allSocialPromises: Promise<{platform: string, content: string}>[] = []
      
      for (const platform of platforms) {
        for (let i = 0; i < postsPerPlatform; i++) {
          allSocialPromises.push(
            (async () => {
              try {
                const socialResponse = await fetch('/api/generate-content', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    topic: generatedContent.topic,
                    platform: platform,
                    tone: clientData?.brand_tone || 'professional',
                    longFormContent: generatedContent.longFormContent, // Pass full content for context
                    clientProfile: {
                      name: clientData?.company_name,
                      industry: clientData?.industry,
                      target_audience: clientData?.target_audience,
                      brand_voice: clientData?.brand_tone,
                      competitors: [],
                      goals: clientData?.content_goals || []
                    }
                  })
                })

                if (socialResponse.ok) {
                  const { content } = await socialResponse.json()
                  return { platform, content }
                }
                console.error(`Failed to generate ${platform} content ${i + 1}:`, socialResponse.status)
                return { platform, content: '' }
              } catch (err) {
                console.error(`Error generating ${platform} content ${i + 1}:`, err)
                return { platform, content: '' }
              }
            })()
          )
        }
      }
      
      const socialResults = await Promise.all(allSocialPromises)
      
      // Group by platform and filter out empty results
      const socialContent: { twitter: SocialPost[], linkedin: SocialPost[], instagram: SocialPost[] } = {
        twitter: [],
        linkedin: [],
        instagram: []
      }

      socialResults.forEach(result => {
        if (result.content && result.content.trim() && result.platform in socialContent) {
          socialContent[result.platform as keyof typeof socialContent].push({
            content: result.content.trim(),
            imageUrl: undefined
          })
        }
      })

      // Update generated content with new social posts
      setGeneratedContent(prev => prev ? {
        ...prev,
        socialContent: socialContent,
        updatedAt: new Date().toISOString()
      } : null)
      
      goToStep('social')
    } catch (error) {
      console.error('Error generating social content:', error)
      alert(`Error generating social posts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSchedulePost = (platform: string, index: number) => {
    setSchedulingPost({ platform, index })
    // Set default date to today
    const today = new Date().toISOString().split('T')[0]
    setScheduleData({
      date: today,
      time: '12:00',
      platforms: [platform]
    })
  }

  const handleSchedule = async () => {
    if (!generatedContent || !schedulingPost) return

    try {
      const platformContent = generatedContent.socialContent[schedulingPost.platform as keyof typeof generatedContent.socialContent]
      const post = platformContent[schedulingPost.index]
      const postContent = typeof post === 'string' ? post : post.content
      const postImageUrl = typeof post === 'object' ? post.imageUrl : undefined
      const scheduledDateTime = new Date(`${scheduleData.date}T${scheduleData.time}`).toISOString()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user's team
      const { data: teamData, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (teamError || !teamData) {
        throw new Error('User not part of any team')
      }

      // Save to content_documents table
      const { data, error } = await supabase
        .from('content_documents')
        .insert([{
          team_id: teamData.team_id,
          title: `Scheduled ${schedulingPost.platform} post`,
          content: postContent,
          platform: schedulingPost.platform,
          created_by: user.id,
          status: 'scheduled',
          metadata: {
            scheduled_at: scheduledDateTime,
            original_content_id: generatedContent.id,
            image_url: postImageUrl // Include image URL in metadata for posting
          }
        }])
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Post scheduled successfully:', data)

      alert(`Post scheduled for ${scheduleData.date} at ${scheduleData.time}!`)
      setSchedulingPost(null)
    } catch (error) {
      console.error('Error scheduling post:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please try again.'
      alert(`Error scheduling post: ${errorMessage}`)
    }
  }

  const handleBulkSchedule = () => {
    setSchedulingPost({ platform: 'bulk', index: 0 })
    setScheduleData({
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      platforms: ['twitter', 'linkedin', 'instagram']
    })
  }

  const handleViewPost = (platform: string, index: number) => {
    if (!generatedContent) return
    const platformContent = generatedContent.socialContent[platform as keyof typeof generatedContent.socialContent]
    const post = platformContent[index]
    setViewingPost({ platform, index, content: typeof post === 'string' ? post : post.content })
  }

  const handleGenerateImage = async (platform: string, index: number) => {
    if (!generatedContent) return
    
    setGeneratingImage({ platform, index })
    
    try {
      const platformContent = generatedContent.socialContent[platform as keyof typeof generatedContent.socialContent]
      const post = platformContent[index]
      const postContent = typeof post === 'string' ? post : post.content
      
      // Create image prompt from the post content
      const imagePrompt = `${postContent.substring(0, 500)}. Visual style: professional, engaging, suitable for ${platform}.`
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          platform: platform
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate image')
      }

      const { imageUrl } = await response.json()
      
      // Update the post with the image URL
      setGeneratedContent(prev => {
        if (!prev) return null
        
        const updatedSocialContent = { ...prev.socialContent }
        const platformPosts = [...updatedSocialContent[platform as keyof typeof updatedSocialContent]]
        const currentPost = platformPosts[index]
        platformPosts[index] = {
          content: typeof currentPost === 'string' ? currentPost : currentPost.content,
          imageUrl: imageUrl
        }
        
        updatedSocialContent[platform as keyof typeof updatedSocialContent] = platformPosts as any
        
        return {
          ...prev,
          socialContent: updatedSocialContent,
          updatedAt: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error generating image:', error)
      alert(`Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeneratingImage(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
            <p className="text-gray-600 mt-1">Create long-form content and generate social media posts</p>
          </div>
          <div className="flex items-center space-x-3">
            {generatedContent && (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-8">
          {[
            { key: 'suggestions', label: 'Suggestions', icon: Lightbulb },
            { key: 'generating', label: 'Generating', icon: Sparkles },
            { key: 'preview', label: 'Preview', icon: FileText },
            { key: 'social', label: 'Social', icon: Share2 }
          ].map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.key
            const isCompleted = ['suggestions', 'generating', 'preview', 'social'].indexOf(currentStep) > index
            const canClick = step.key === 'suggestions' || (step.key === 'preview' && generatedContent) || (step.key === 'social' && generatedContent)
            
            return (
              <div key={step.key} className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (canClick && step.key !== 'generating') {
                      goToStep(step.key as 'suggestions' | 'generating' | 'preview' | 'social')
                    }
                  }}
                  disabled={!canClick || step.key === 'generating'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 
                    isCompleted ? 'bg-green-600 text-white hover:bg-green-700' : 
                    canClick ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' :
                    'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
                <span className={`text-sm font-medium ${
                  isActive ? 'text-blue-600' : 
                  isCompleted ? 'text-green-600' : 
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < 3 && (
                  <div className={`w-8 h-0.5 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        {/* Navigation Arrows */}
        {canGoBack() && (
          <button
            onClick={goBack}
            disabled={!canGoBack()}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              canGoBack()
                ? 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        
        {currentStep !== 'social' && (
          <button
            onClick={() => {
              if (currentStep === 'preview' && generatedContent) {
                handleGenerateSocial()
              } else if (currentStep === 'suggestions' && (selectedTopic || customTopic.trim())) {
                handleGenerate()
              }
            }}
            disabled={currentStep === 'suggestions' && !selectedTopic && !customTopic.trim()}
            className={`fixed right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              ((currentStep === 'suggestions' && (selectedTopic || customTopic.trim())) || (currentStep === 'preview' && generatedContent))
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
        {currentStep === 'suggestions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            {/* Client Intelligence Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-sm p-6 mb-6 text-white">
              <div className="flex items-center space-x-3 mb-4">
                <Zap className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Smart Content Suggestions</h2>
                  <p className="text-blue-100">Based on your business profile and industry research</p>
                </div>
              </div>
              
              {clientData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Company:</span> {clientData.company_name}
                  </div>
                  <div>
                    <span className="font-semibold">Industry:</span> {clientData.industry}
                  </div>
                  <div>
                    <span className="font-semibold">Audience:</span> {clientData.target_audience}
                  </div>
                </div>
              )}
              
              {clientData?.company_name?.includes('[Set up') && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm mb-2">
                    Complete your company profile to get personalized content suggestions
                  </p>
                  <a
                    href="/onboarding"
                    className="inline-flex items-center space-x-2 text-yellow-700 hover:text-yellow-800 font-medium"
                  >
                    <span>Set up profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trending Topics */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Trending Topics</h3>
                </div>
                
                {intelligenceLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trendingTopics.map((topic, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedTopic(topic)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedTopic?.topic === topic.topic
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{topic.topic}</h4>
                            <p className="text-sm text-gray-600 mb-2">{topic.content_angle}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>{topic.trending_score}% trending</span>
                              </span>
                              <span>Target: {topic.target_audience}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                              {selectedTopic?.topic === topic.topic && (
                                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {topic.keywords.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {topic.keywords.slice(0, 3).map((keyword, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {keyword}
                              </span>
                            ))}
                            {topic.keywords.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                +{topic.keywords.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Topic */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Custom Topic</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What would you like to write about?
                    </label>
                    <textarea
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="Enter your custom topic or idea..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {clientData?.seo_keywords && clientData.seo_keywords.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Suggested Keywords
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {clientData.seo_keywords.map((keyword, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={!selectedTopic && !customTopic.trim()}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                <span>Generate Content</span>
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 'generating' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Generating Your Content</h2>
              <p className="text-gray-600 mb-6">
                Our AI is analyzing your topic and creating a comprehensive research paper...
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>✓ Analyzing topic and context</p>
                <p>✓ Researching current trends</p>
                <p>✓ Structuring content outline</p>
                <p>⏳ Generating detailed content...</p>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 'preview' && generatedContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{generatedContent.title}</h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsEditing(prev => !prev)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{isEditing ? 'Done' : 'Edit'}</span>
                  </button>
                  <button
                    onClick={handleGenerateSocial}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Generate Social Posts</span>
                  </button>
                </div>
              </div>

              {isEditing ? (
                <CollaborativeEditor
                  documentId={generatedContent.id}
                  teamId={''}
                  userId={''}
                  userName={'You'}
                  currentDocument={{ content: generatedContent.longFormContent }}
                  readOnly={false}
                  platform="blog"
                  onSave={(content) => {
                    setGeneratedContent(prev => prev ? { ...prev, longFormContent: content, updatedAt: new Date().toISOString() } : prev)
                  }}
                />
              ) : (
                <div className="prose max-w-none prose-headings:font-bold prose-p:text-gray-700 prose-li:text-gray-700">
                  <div className="whitespace-pre-wrap text-gray-800 font-sans">
                    {generatedContent.longFormContent.split('\n').map((line, index) => {
                      // Basic markdown rendering
                      if (line.startsWith('# ')) {
                        return <h1 key={index} className="text-3xl font-bold mt-6 mb-4">{line.substring(2)}</h1>
                      }
                      if (line.startsWith('## ')) {
                        return <h2 key={index} className="text-2xl font-bold mt-5 mb-3">{line.substring(3)}</h2>
                      }
                      if (line.startsWith('### ')) {
                        return <h3 key={index} className="text-xl font-bold mt-4 mb-2">{line.substring(4)}</h3>
                      }
                      if (line.startsWith('- ') || line.startsWith('* ')) {
                        return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li>
                      }
                      if (line.trim() === '') {
                        return <br key={index} />
                      }
                      // Bold text
                      const boldLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      return <p key={index} className="mb-4" dangerouslySetInnerHTML={{ __html: boldLine }} />
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {currentStep === 'social' && generatedContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Social Media Content</h2>
                <p className="text-gray-600">Generated from your research paper: "{generatedContent.title}"</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBulkSchedule}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span>Schedule All</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Twitter */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">T</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">Twitter</h3>
                </div>
                <div className="space-y-3">
                  {generatedContent.socialContent.twitter.map((post, index) => {
                    const postContent = typeof post === 'string' ? post : post.content
                    const postImage = typeof post === 'object' ? post.imageUrl : undefined
                    const isGeneratingImg = generatingImage?.platform === 'twitter' && generatingImage?.index === index
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                        {postImage && (
                          <img src={postImage} alt="Post image" className="w-full h-32 object-cover rounded mb-2" />
                        )}
                        <div className="mb-2 line-clamp-2" onClick={() => handleViewPost('twitter', index)}>{postContent}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerateImage('twitter', index)
                            }}
                            disabled={isGeneratingImg}
                            className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            {isGeneratingImg ? 'Generating...' : 'Generate Image'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSchedulePost('twitter', index)
                            }}
                            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Schedule</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* LinkedIn */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">in</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">LinkedIn</h3>
                </div>
                <div className="space-y-3">
                  {generatedContent.socialContent.linkedin.map((post, index) => {
                    const postContent = typeof post === 'string' ? post : post.content
                    const postImage = typeof post === 'object' ? post.imageUrl : undefined
                    const isGeneratingImg = generatingImage?.platform === 'linkedin' && generatingImage?.index === index
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                        {postImage && (
                          <img src={postImage} alt="Post image" className="w-full h-32 object-cover rounded mb-2" />
                        )}
                        <div className="mb-2 line-clamp-2" onClick={() => handleViewPost('linkedin', index)}>{postContent}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerateImage('linkedin', index)
                            }}
                            disabled={isGeneratingImg}
                            className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            {isGeneratingImg ? 'Generating...' : 'Generate Image'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSchedulePost('linkedin', index)
                            }}
                            className="flex items-center space-x-1 px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-800 transition-colors"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Schedule</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Instagram */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">IG</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">Instagram</h3>
                </div>
                <div className="space-y-3">
                  {generatedContent.socialContent.instagram.map((post, index) => {
                    const postContent = typeof post === 'string' ? post : post.content
                    const postImage = typeof post === 'object' ? post.imageUrl : undefined
                    const isGeneratingImg = generatingImage?.platform === 'instagram' && generatingImage?.index === index
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                        {postImage && (
                          <img src={postImage} alt="Post image" className="w-full h-32 object-cover rounded mb-2" />
                        )}
                        <div className="mb-2 line-clamp-2" onClick={() => handleViewPost('instagram', index)}>{postContent}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerateImage('instagram', index)
                            }}
                            disabled={isGeneratingImg}
                            className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            {isGeneratingImg ? 'Generating...' : 'Generate Image'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSchedulePost('instagram', index)
                            }}
                            className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded hover:from-purple-600 hover:to-pink-600 transition-colors"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Schedule</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Scheduling Modal */}
      {schedulingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {schedulingPost.platform === 'bulk' ? 'Schedule All Posts' : `Schedule ${schedulingPost.platform.charAt(0).toUpperCase() + schedulingPost.platform.slice(1)} Post`}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {schedulingPost.platform === 'bulk' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platforms
                  </label>
                  <div className="space-y-2">
                    {['twitter', 'linkedin', 'instagram'].map(platform => (
                      <label key={platform} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={scheduleData.platforms.includes(platform)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setScheduleData(prev => ({
                                ...prev,
                                platforms: [...prev.platforms, platform]
                              }))
                            } else {
                              setScheduleData(prev => ({
                                ...prev,
                                platforms: prev.platforms.filter(p => p !== platform)
                              }))
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{platform}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSchedulingPost(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Schedule
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Post View Modal */}
      {viewingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  viewingPost.platform === 'twitter' ? 'bg-blue-500' :
                  viewingPost.platform === 'linkedin' ? 'bg-blue-700' :
                  'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}>
                  <span className="text-white font-bold text-sm">
                    {viewingPost.platform === 'twitter' ? 'T' :
                     viewingPost.platform === 'linkedin' ? 'in' :
                     'IG'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {viewingPost.platform} Post #{viewingPost.index + 1}
                  </h3>
                  <p className="text-sm text-gray-500">Full content preview</p>
                </div>
              </div>
              <button
                onClick={() => setViewingPost(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-900 whitespace-pre-wrap">{viewingPost.content}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {viewingPost.content.length} characters
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setViewingPost(null)
                    handleSchedulePost(viewingPost.platform, viewingPost.index)
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span>Schedule This Post</span>
                </button>
                <button
                  onClick={() => setViewingPost(null)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
