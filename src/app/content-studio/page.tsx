'use client'

import { useState, useEffect } from 'react'
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
  documentId?: string
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
  const [editingPost, setEditingPost] = useState<{platform: string, index: number} | null>(null)
  const [loadingDraft, setLoadingDraft] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load most recent draft on mount
  useEffect(() => {
    loadMostRecentDraft()
  }, [])

  const loadMostRecentDraft = async () => {
    try {
      setLoadingDraft(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoadingDraft(false)
        return
      }

      const { data: teamMemberData, error: teamMemberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (teamMemberError || !teamMemberData) {
        setLoadingDraft(false)
        return
      }

      const { data: documents, error } = await supabase
        .from('content_documents')
        .select('*')
        .eq('team_id', teamMemberData.team_id)
        .eq('status', 'draft')
        .eq('platform', 'blog')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error || !documents || documents.length === 0) {
        setLoadingDraft(false)
        return
      }

      const doc = documents[0]
      const metadata = doc.metadata || {}
      
      const content: ContentPiece = {
        id: doc.id,
        documentId: doc.id,
        title: doc.title,
        topic: doc.topic || metadata.topic || 'Untitled',
        targetAudience: metadata.target_audience || clientData?.target_audience || '',
        contentLength: metadata.content_length || 'long',
        tone: (metadata.tone as any) || 'professional',
        keywords: metadata.keywords || [],
        longFormContent: doc.content || '',
        socialContent: metadata.social_content || {
          twitter: [],
          linkedin: [],
          instagram: []
        },
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        status: doc.status as 'draft' | 'ready' | 'published'
      }

      setGeneratedContent(content)
      
      // Determine which step to show
      if (content.longFormContent && content.longFormContent.length > 0) {
        if (content.socialContent && (
          content.socialContent.twitter.length > 0 ||
          content.socialContent.linkedin.length > 0 ||
          content.socialContent.instagram.length > 0
        )) {
          setCurrentStep('social')
          setStepHistory(['suggestions', 'generating', 'preview', 'social'])
        } else {
          setCurrentStep('preview')
          setStepHistory(['suggestions', 'generating', 'preview'])
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    } finally {
      setLoadingDraft(false)
    }
  }

  // Auto-save function
  const autoSave = async (content: ContentPiece, silent = false) => {
    if (!content || !content.longFormContent) return
    
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: teamMemberData, error: teamMemberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (teamMemberError || !teamMemberData) return

      const updateData: any = {
        title: content.title,
        content: content.longFormContent,
        topic: content.topic,
        updated_at: new Date().toISOString(),
        metadata: {
          target_audience: content.targetAudience,
          tone: content.tone,
          keywords: content.keywords,
          content_length: content.contentLength,
          social_content: content.socialContent
        }
      }

      if (content.documentId) {
        await supabase
          .from('content_documents')
          .update(updateData)
          .eq('id', content.documentId)
      } else {
        const { data, error } = await supabase
          .from('content_documents')
          .insert({
            team_id: teamMemberData.team_id,
            ...updateData,
            platform: 'blog',
            status: 'draft',
            created_by: user.id
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setGeneratedContent(prev => prev ? { ...prev, documentId: data.id } : null)
        }
      }
    } catch (error) {
      console.error('Auto-save error:', error)
      if (!silent) alert('Failed to auto-save')
    } finally {
      setSaving(false)
    }
  }

  // Auto-save on content change (debounced)
  useEffect(() => {
    if (!generatedContent || !generatedContent.documentId) return
    const timer = setTimeout(() => {
      autoSave(generatedContent, true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [generatedContent?.longFormContent, generatedContent?.socialContent])

  const goToStep = (step: 'suggestions' | 'generating' | 'preview' | 'social') => {
    setCurrentStep(step)
    setStepHistory(prev => [...prev, step])
  }

  const goBack = () => {
    if (stepHistory.length > 1) {
      const newHistory = [...stepHistory]
      newHistory.pop()
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
    
      const socialContent: { twitter: SocialPost[], linkedin: SocialPost[], instagram: SocialPost[] } = {
        twitter: [],
        linkedin: [],
        instagram: []
      }

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
      await autoSave(generatedContentData)
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
      await autoSave(generatedContent, false)
      alert('Content saved successfully!')
    } catch (error) {
      console.error('Error saving content:', error)
      alert(`Error saving content: ${error instanceof Error ? error.message : 'Please try again.'}`)
    }
  }

  const handleGenerateSocial = async () => {
    if (!generatedContent) return
    
    setIsGenerating(true)
    
    try {
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
                    longFormContent: generatedContent.longFormContent,
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
                console.error(`Failed to generate ${platform} content:`, socialResponse.status)
                return { platform, content: '' }
              } catch (err) {
                console.error(`Error generating ${platform} content:`, err)
                return { platform, content: '' }
              }
            })()
          )
        }
      }
      
      const socialResults = await Promise.all(allSocialPromises)
      
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

      const updatedContent = {
        ...generatedContent,
        socialContent: socialContent,
        updatedAt: new Date().toISOString()
      }

      setGeneratedContent(updatedContent)
      await autoSave(updatedContent)
      goToStep('social')
    } catch (error) {
      console.error('Error generating social content:', error)
      alert(`Error generating social posts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleViewPost = (platform: string, index: number) => {
    if (!generatedContent) return
    const platformContent = generatedContent.socialContent[platform as keyof typeof generatedContent.socialContent]
    const post = platformContent[index]
    setViewingPost({ platform, index, content: typeof post === 'string' ? post : post.content })
  }

  const handleUpdateSocialPost = (platform: string, index: number, newContent: string) => {
    if (!generatedContent) return
    const updatedSocialContent = { ...generatedContent.socialContent }
    const platformPosts = [...updatedSocialContent[platform as keyof typeof updatedSocialContent]]
    const currentPost = platformPosts[index]
    platformPosts[index] = {
      content: newContent,
      imageUrl: typeof currentPost === 'object' ? currentPost.imageUrl : undefined
    }
    
    updatedSocialContent[platform as keyof typeof updatedSocialContent] = platformPosts as any
    
    setGeneratedContent({
      ...generatedContent,
      socialContent: updatedSocialContent,
      updatedAt: new Date().toISOString()
    })
  }

  const handleGenerateImage = async (platform: string, index: number) => {
    if (!generatedContent) return
    
    setGeneratingImage({ platform, index })
    
    try {
      const platformContent = generatedContent.socialContent[platform as keyof typeof generatedContent.socialContent]
      const post = platformContent[index]
      const postContent = typeof post === 'string' ? post : post.content
      
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
      
      const updatedSocialContent = { ...generatedContent.socialContent }
      const platformPosts = [...updatedSocialContent[platform as keyof typeof updatedSocialContent]]
      const currentPost = platformPosts[index]
      platformPosts[index] = {
        content: typeof currentPost === 'string' ? currentPost : currentPost.content,
        imageUrl: imageUrl
      }
      
      updatedSocialContent[platform as keyof typeof updatedSocialContent] = platformPosts as any
      
      setGeneratedContent({
        ...generatedContent,
        socialContent: updatedSocialContent,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error generating image:', error)
      alert(`Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeneratingImage(null)
    }
  }

  const handleSchedulePost = (platform: string, index: number) => {
    setSchedulingPost({ platform, index })
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

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: teamData, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (teamError || !teamData) {
        throw new Error('User not part of any team')
      }

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
            image_url: postImageUrl
          }
        }])
        .select()

      if (error) {
        throw error
      }

      alert(`Post scheduled for ${scheduleData.date} at ${scheduleData.time}!`)
      setSchedulingPost(null)
    } catch (error) {
      console.error('Error scheduling post:', error)
      alert(`Error scheduling post: ${error instanceof Error ? error.message : 'Please try again.'}`)
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

  if (loadingDraft) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
          <div className="flex items-center space-x-4">
            {saving && <span className="text-sm text-gray-500">Saving...</span>}
            {canGoBack() && (
              <button
                onClick={goBack}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {currentStep === 'suggestions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto px-6 py-8"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What would you like to create?</h2>
              <p className="text-gray-600">
                Choose a trending topic or create your own custom content idea
              </p>
              
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
            className="max-w-4xl mx-auto px-6 py-8"
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
                    const updated = { ...generatedContent, longFormContent: content, updatedAt: new Date().toISOString() }
                    setGeneratedContent(updated)
                    setIsEditing(false)
                  }}
                />
              ) : (
                <div className="prose max-w-none prose-headings:font-bold prose-p:text-gray-700 prose-li:text-gray-700">
                  <div className="whitespace-pre-wrap text-gray-800 font-sans">
                    {generatedContent.longFormContent.split('\n').map((line, index) => {
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
            className="max-w-6xl mx-auto px-6 py-8"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Twitter */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">T</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">Twitter</h3>
                </div>
                <div className="space-y-3">
                  {generatedContent.socialContent.twitter.map((post, index) => {
                    const postContent = typeof post === 'string' ? post : post.content
                    const postImage = typeof post === 'object' ? post.imageUrl : undefined
                    const isEditing = editingPost?.platform === 'twitter' && editingPost?.index === index
                    const isGeneratingImg = generatingImage?.platform === 'twitter' && generatingImage?.index === index
                    
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        {postImage && (
                          <img src={postImage} alt="Post image" className="w-full h-32 object-cover rounded mb-2" />
                        )}
                        {isEditing ? (
                          <textarea
                            value={postContent}
                            onChange={(e) => {
                              const updated = { ...generatedContent }
                              const posts = [...updated.socialContent.twitter]
                              posts[index] = { content: e.target.value, imageUrl: postImage }
                              updated.socialContent.twitter = posts
                              updated.updatedAt = new Date().toISOString()
                              setGeneratedContent(updated)
                            }}
                            onBlur={() => {
                              handleUpdateSocialPost('twitter', index, postContent)
                              setEditingPost(null)
                            }}
                            className="w-full p-2 border border-gray-300 rounded text-xs"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                            onClick={() => setEditingPost({ platform: 'twitter', index })}
                          >
                            {postContent}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGenerateImage('twitter', index)}
                            disabled={isGeneratingImg}
                            className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isGeneratingImg ? 'Generating...' : 'Generate Image'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSchedulePost('twitter', index)
                            }}
                            className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            <Clock className="w-3 h-3 inline mr-1" />
                            Schedule
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
                    const isEditing = editingPost?.platform === 'linkedin' && editingPost?.index === index
                    const isGeneratingImg = generatingImage?.platform === 'linkedin' && generatingImage?.index === index
                    
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        {postImage && (
                          <img src={postImage} alt="Post image" className="w-full h-32 object-cover rounded mb-2" />
                        )}
                        {isEditing ? (
                          <textarea
                            value={postContent}
                            onChange={(e) => {
                              const updated = { ...generatedContent }
                              const posts = [...updated.socialContent.linkedin]
                              posts[index] = { content: e.target.value, imageUrl: postImage }
                              updated.socialContent.linkedin = posts
                              updated.updatedAt = new Date().toISOString()
                              setGeneratedContent(updated)
                            }}
                            onBlur={() => {
                              handleUpdateSocialPost('linkedin', index, postContent)
                              setEditingPost(null)
                            }}
                            className="w-full p-2 border border-gray-300 rounded text-xs"
                            rows={4}
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                            onClick={() => setEditingPost({ platform: 'linkedin', index })}
                          >
                            {postContent}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGenerateImage('linkedin', index)}
                            disabled={isGeneratingImg}
                            className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isGeneratingImg ? 'Generating...' : 'Generate Image'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSchedulePost('linkedin', index)
                            }}
                            className="flex-1 px-3 py-1.5 bg-blue-700 text-white text-xs rounded hover:bg-blue-800"
                          >
                            <Clock className="w-3 h-3 inline mr-1" />
                            Schedule
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
                    const isEditing = editingPost?.platform === 'instagram' && editingPost?.index === index
                    const isGeneratingImg = generatingImage?.platform === 'instagram' && generatingImage?.index === index
                    
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        {postImage && (
                          <img src={postImage} alt="Post image" className="w-full h-32 object-cover rounded mb-2" />
                        )}
                        {isEditing ? (
                          <textarea
                            value={postContent}
                            onChange={(e) => {
                              const updated = { ...generatedContent }
                              const posts = [...updated.socialContent.instagram]
                              posts[index] = { content: e.target.value, imageUrl: postImage }
                              updated.socialContent.instagram = posts
                              updated.updatedAt = new Date().toISOString()
                              setGeneratedContent(updated)
                            }}
                            onBlur={() => {
                              handleUpdateSocialPost('instagram', index, postContent)
                              setEditingPost(null)
                            }}
                            className="w-full p-2 border border-gray-300 rounded text-xs"
                            rows={4}
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                            onClick={() => setEditingPost({ platform: 'instagram', index })}
                          >
                            {postContent}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGenerateImage('instagram', index)}
                            disabled={isGeneratingImg}
                            className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isGeneratingImg ? 'Generating...' : 'Generate Image'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSchedulePost('instagram', index)
                            }}
                            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded hover:from-purple-600 hover:to-pink-600"
                          >
                            <Clock className="w-3 h-3 inline mr-1" />
                            Schedule
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

      {/* Schedule Modal */}
      {schedulingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Schedule Post</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setSchedulingPost(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
