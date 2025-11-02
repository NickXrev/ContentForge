'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, Lightbulb, ArrowRight, ChevronLeft, Clock, Edit3, Image as ImageIcon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useClientIntelligence, TrendingTopic } from '@/hooks/useClientIntelligence'

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

type Step = 'main' | 'generating-longform' | 'longform-editor' | 'generating-social' | 'social-posts'

export default function ContentStudioPage() {
  const { clientData, trendingTopics } = useClientIntelligence()
  const [currentStep, setCurrentStep] = useState<Step>('main')
  const [activeContent, setActiveContent] = useState<ContentPiece | null>(null)
  const [previousContent, setPreviousContent] = useState<ContentPiece[]>([])
  const [prompt, setPrompt] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingImage, setGeneratingImage] = useState<{platform: string, index: number} | null>(null)
  const [editingPost, setEditingPost] = useState<{platform: string, index: number} | null>(null)
  const [schedulingPost, setSchedulingPost] = useState<{platform: string, index: number} | null>(null)
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' })

  // Load previous content on mount
  useEffect(() => {
    loadPreviousContent()
  }, [])

  const loadPreviousContent = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: teamMemberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (!teamMemberData) {
        setLoading(false)
        return
      }

      const { data: documents } = await supabase
        .from('content_documents')
        .select('*')
        .eq('team_id', teamMemberData.team_id)
        .eq('platform', 'blog')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (documents && documents.length > 0) {
        const contentList = documents.map(doc => {
          const metadata = doc.metadata || {}
          return {
            id: doc.id,
            documentId: doc.id,
            title: doc.title,
            topic: doc.topic || metadata.topic || 'Untitled',
            targetAudience: metadata.target_audience || '',
            contentLength: metadata.content_length || 'long',
            tone: (metadata.tone as any) || 'professional',
            keywords: metadata.keywords || [],
            longFormContent: doc.content || '',
            socialContent: metadata.social_content || { twitter: [], linkedin: [], instagram: [] },
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
            status: doc.status as 'draft' | 'ready' | 'published'
          } as ContentPiece
        })
        setPreviousContent(contentList)
      }
    } catch (error) {
      console.error('Error loading previous content:', error)
    } finally {
      setLoading(false)
    }
  }

  const autoSave = async (content: ContentPiece, silent = false) => {
    if (!content || !content.longFormContent) return
    
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: teamMemberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (!teamMemberData) return

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
          setActiveContent(prev => prev ? { ...prev, documentId: data.id } : null)
          loadPreviousContent() // Refresh list
        }
      }
    } catch (error) {
      console.error('Auto-save error:', error)
      if (!silent) alert('Failed to auto-save')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!activeContent || !activeContent.documentId) return
    const timer = setTimeout(() => {
      autoSave(activeContent, true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [activeContent?.longFormContent, activeContent?.socialContent])

  const handleGenerate = async () => {
    const topic = selectedTopic?.topic || prompt.trim()
    if (!topic) return
    
    setIsGenerating(true)
    setCurrentStep('generating-longform')
    
    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
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
      const titleMatch = longFormContent.match(/^#\s*(.+)$/m) || longFormContent.match(/^(.+)$/m)
      const title = titleMatch ? titleMatch[1].replace(/^#+\s*/, '') : `${topic}: A Guide`

      const newContent: ContentPiece = {
        id: Date.now().toString(),
        title: title,
        topic: topic,
        targetAudience: clientData?.target_audience || '',
        contentLength: 'long',
        tone: (clientData?.brand_tone as any) || 'professional',
        keywords: selectedTopic?.keywords || [],
        longFormContent: longFormContent,
        socialContent: { twitter: [], linkedin: [], instagram: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft'
      }

      setActiveContent(newContent)
      await autoSave(newContent)
      setCurrentStep('longform-editor')
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setCurrentStep('main')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleContinueToSocial = async () => {
    if (!activeContent) return
    setCurrentStep('generating-social')
    setIsGenerating(true)
    
    try {
      const platforms = ['twitter', 'linkedin', 'instagram']
      const allPromises: Promise<{platform: string, content: string}>[] = []
      
      for (const platform of platforms) {
        for (let i = 0; i < 3; i++) {
          allPromises.push(
            fetch('/api/generate-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic: activeContent.topic,
                platform: platform,
                tone: clientData?.brand_tone || 'professional',
                longFormContent: activeContent.longFormContent,
                clientProfile: {
                  name: clientData?.company_name,
                  industry: clientData?.industry,
                  target_audience: clientData?.target_audience,
                  brand_voice: clientData?.brand_tone,
                  competitors: [],
                  goals: clientData?.content_goals || []
                }
              })
            }).then(res => res.ok ? res.json() : { content: '' })
            .then(data => ({ platform, content: data.content || '' }))
            .catch(() => ({ platform, content: '' }))
          )
        }
      }
      
      const results = await Promise.all(allPromises)
      const socialContent: { twitter: SocialPost[], linkedin: SocialPost[], instagram: SocialPost[] } = {
        twitter: [],
        linkedin: [],
        instagram: []
      }

      results.forEach(result => {
        if (result.content && result.content.trim() && result.platform in socialContent) {
          socialContent[result.platform as keyof typeof socialContent].push({
            content: result.content.trim(),
            imageUrl: undefined
          })
        }
      })

      const updated = {
        ...activeContent,
        socialContent: socialContent,
        updatedAt: new Date().toISOString()
      }

      setActiveContent(updated)
      await autoSave(updated)
      setCurrentStep('social-posts')
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleResumeContent = (content: ContentPiece) => {
    setActiveContent(content)
    if (content.socialContent && (
      content.socialContent.twitter.length > 0 ||
      content.socialContent.linkedin.length > 0 ||
      content.socialContent.instagram.length > 0
    )) {
      setCurrentStep('social-posts')
    } else if (content.longFormContent) {
      setCurrentStep('longform-editor')
    } else {
      setCurrentStep('longform-editor')
    }
  }

  const handleUpdateSocialPost = (platform: string, index: number, newContent: string) => {
    if (!activeContent) return
    const updated = { ...activeContent.socialContent }
    const posts = [...updated[platform as keyof typeof updated]]
    const current = posts[index]
    posts[index] = {
      content: newContent,
      imageUrl: typeof current === 'object' ? current.imageUrl : undefined
    }
    updated[platform as keyof typeof updated] = posts as any
    
    setActiveContent({
      ...activeContent,
      socialContent: updated,
      updatedAt: new Date().toISOString()
    })
    setEditingPost(null)
  }

  const handleGenerateImage = async (platform: string, index: number) => {
    if (!activeContent) return
    setGeneratingImage({ platform, index })
    
    try {
      const posts = activeContent.socialContent[platform as keyof typeof activeContent.socialContent]
      const post = posts[index]
      const postContent = typeof post === 'string' ? post : post.content
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${postContent.substring(0, 500)}. Visual style: professional, engaging, suitable for ${platform}.`,
          platform: platform
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.details || `Failed to generate image (${response.status})`)
      }
      
      const data = await response.json()
      
      if (!data.imageUrl) {
        throw new Error('No image URL returned from API')
      }
      
      const updated = { ...activeContent.socialContent }
      const platformPosts = [...updated[platform as keyof typeof updated]]
      platformPosts[index] = {
        content: typeof platformPosts[index] === 'string' ? platformPosts[index] : platformPosts[index].content,
        imageUrl: data.imageUrl
      }
      updated[platform as keyof typeof updated] = platformPosts as any
      
      setActiveContent({
        ...activeContent,
        socialContent: updated,
        updatedAt: new Date().toISOString()
      })
      
      await autoSave({
        ...activeContent,
        socialContent: updated,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Image generation error:', error)
      alert(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeneratingImage(null)
    }
  }

  const handleSchedulePost = (platform: string, index: number) => {
    setSchedulingPost({ platform, index })
    const today = new Date().toISOString().split('T')[0]
    setScheduleData({
      date: today,
      time: '12:00'
    })
  }

  const handleSchedule = async () => {
    if (!activeContent || !schedulingPost) return

    try {
      const platformContent = activeContent.socialContent[schedulingPost.platform as keyof typeof activeContent.socialContent]
      const post = platformContent[schedulingPost.index]
      const postContent = typeof post === 'string' ? post : post.content
      const postImageUrl = typeof post === 'object' ? post.imageUrl : undefined
      const scheduledDateTime = new Date(`${scheduleData.date}T${scheduleData.time}`).toISOString()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (!teamData) throw new Error('No team found')

      const { error } = await supabase.from('content_documents').insert([{
        team_id: teamData.team_id,
        title: `Scheduled ${schedulingPost.platform} post`,
        content: postContent,
        platform: schedulingPost.platform,
        created_by: user.id,
        status: 'scheduled',
        metadata: {
          scheduled_at: scheduledDateTime,
          image_url: postImageUrl
        }
      }])

      if (error) throw error

      alert(`Post scheduled for ${scheduleData.date} at ${scheduleData.time}!`)
      setSchedulingPost(null)
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
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
    })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Content Studio</h1>
          <div className="flex items-center space-x-3">
            {saving && <span className="text-sm text-gray-500">Saving...</span>}
            {currentStep !== 'main' && (
              <button
                onClick={() => {
                  setCurrentStep('main')
                  if (activeContent) {
                    loadPreviousContent()
                  }
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm flex items-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Studio</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {currentStep === 'main' && (
          <div className="max-w-6xl mx-auto px-6 py-8">
            {/* Prompt Input Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4">Generate New Content</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Trending Topics */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold">Trending Topics</h3>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {trendingTopics.map((topic, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedTopic(topic)
                          setPrompt(topic.topic)
                        }}
                        className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                          selectedTopic?.topic === topic.topic
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{topic.topic}</div>
                        {topic.content_angle && (
                          <div className="text-xs text-gray-600 mt-1">{topic.content_angle}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Prompt */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-semibold">Custom Topic</h3>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value)
                      setSelectedTopic(null)
                    }}
                    placeholder="Enter your content topic or idea..."
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Content</span>
                  </>
                )}
              </button>
            </div>

            {/* Previous Content List */}
            {previousContent.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Previous Generations</h2>
                <div className="space-y-3">
                  {previousContent.map((content) => (
                    <div
                      key={content.id}
                      onClick={() => handleResumeContent(content)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{content.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{content.topic}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{new Date(content.updatedAt).toLocaleDateString()}</span>
                            <span>{content.longFormContent.split(/\s+/).length} words</span>
                            {(content.socialContent.twitter.length > 0 ||
                              content.socialContent.linkedin.length > 0 ||
                              content.socialContent.instagram.length > 0) && (
                              <span className="text-green-600">Social posts generated</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'generating-longform' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-semibold mb-2">Generating Long-Form Content</h2>
              <p className="text-gray-600">This may take a moment...</p>
            </div>
          </div>
        )}

        {currentStep === 'longform-editor' && activeContent && (
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{activeContent.title}</h2>
                <button
                  onClick={handleContinueToSocial}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Generating...' : 'Generate Social Posts'}</span>
                </button>
              </div>
              
              <textarea
                value={activeContent.longFormContent}
                onChange={(e) => {
                  setActiveContent({
                    ...activeContent,
                    longFormContent: e.target.value,
                    updatedAt: new Date().toISOString()
                  })
                }}
                className="w-full h-[600px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                placeholder="Your content..."
              />
              
              <div className="mt-4 text-sm text-gray-600">
                {activeContent.longFormContent.split(/\s+/).filter(w => w.length > 0).length} words
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              <div className="prose max-w-none">
                {renderMarkdown(activeContent.longFormContent)}
              </div>
            </div>
          </div>
        )}

        {currentStep === 'generating-social' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-semibold mb-2">Generating Social Posts</h2>
              <p className="text-gray-600">Creating posts for Twitter, LinkedIn, and Instagram...</p>
            </div>
          </div>
        )}

        {currentStep === 'social-posts' && activeContent && (
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Social Media Posts</h2>
              <p className="text-gray-600">Generated from: {activeContent.title}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Twitter */}
              {activeContent.socialContent.twitter.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">T</span>
                    </div>
                    <h3 className="font-semibold">Twitter</h3>
                  </div>
                  <div className="space-y-3">
                    {activeContent.socialContent.twitter.map((post, i) => {
                      const content = typeof post === 'string' ? post : post.content
                      const imageUrl = typeof post === 'object' ? post.imageUrl : undefined
                      const isEditing = editingPost?.platform === 'twitter' && editingPost?.index === i
                      
                      return (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                          {imageUrl && (
                            <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded mb-2" />
                          )}
                          {isEditing ? (
                            <textarea
                              value={content}
                              onChange={(e) => {
                                const updated = { ...activeContent }
                                const posts = [...updated.socialContent.twitter]
                                posts[i] = { content: e.target.value, imageUrl: imageUrl }
                                updated.socialContent.twitter = posts
                                updated.updatedAt = new Date().toISOString()
                                setActiveContent(updated)
                              }}
                              onBlur={() => {
                                handleUpdateSocialPost('twitter', i, content)
                                setEditingPost(null)
                              }}
                              className="w-full p-2 border rounded text-xs"
                              rows={3}
                              autoFocus
                            />
                          ) : (
                            <div 
                              onClick={() => setEditingPost({ platform: 'twitter', index: i })}
                              className="mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                            >
                              {content}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleGenerateImage('twitter', i)}
                              disabled={generatingImage?.platform === 'twitter' && generatingImage?.index === i}
                              className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                            >
                              Image
                            </button>
                            <button
                              onClick={() => handleSchedulePost('twitter', i)}
                              className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Schedule
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* LinkedIn */}
              {activeContent.socialContent.linkedin.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">in</span>
                    </div>
                    <h3 className="font-semibold">LinkedIn</h3>
                  </div>
                  <div className="space-y-3">
                    {activeContent.socialContent.linkedin.map((post, i) => {
                      const content = typeof post === 'string' ? post : post.content
                      const imageUrl = typeof post === 'object' ? post.imageUrl : undefined
                      const isEditing = editingPost?.platform === 'linkedin' && editingPost?.index === i
                      
                      return (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                          {imageUrl && (
                            <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded mb-2" />
                          )}
                          {isEditing ? (
                            <textarea
                              value={content}
                              onChange={(e) => {
                                const updated = { ...activeContent }
                                const posts = [...updated.socialContent.linkedin]
                                posts[i] = { content: e.target.value, imageUrl: imageUrl }
                                updated.socialContent.linkedin = posts
                                updated.updatedAt = new Date().toISOString()
                                setActiveContent(updated)
                              }}
                              onBlur={() => {
                                handleUpdateSocialPost('linkedin', i, content)
                                setEditingPost(null)
                              }}
                              className="w-full p-2 border rounded text-xs"
                              rows={4}
                              autoFocus
                            />
                          ) : (
                            <div 
                              onClick={() => setEditingPost({ platform: 'linkedin', index: i })}
                              className="mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                            >
                              {content}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleGenerateImage('linkedin', i)}
                              disabled={generatingImage?.platform === 'linkedin' && generatingImage?.index === i}
                              className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {generatingImage?.platform === 'linkedin' && generatingImage?.index === i ? 'Generating...' : 'Image'}
                            </button>
                            <button
                              onClick={() => handleSchedulePost('linkedin', i)}
                              className="flex-1 px-2 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-800"
                            >
                              Schedule
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Instagram */}
              {activeContent.socialContent.instagram.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">IG</span>
                    </div>
                    <h3 className="font-semibold">Instagram</h3>
                  </div>
                  <div className="space-y-3">
                    {activeContent.socialContent.instagram.map((post, i) => {
                      const content = typeof post === 'string' ? post : post.content
                      const imageUrl = typeof post === 'object' ? post.imageUrl : undefined
                      const isEditing = editingPost?.platform === 'instagram' && editingPost?.index === i
                      
                      return (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                          {imageUrl && (
                            <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded mb-2" />
                          )}
                          {isEditing ? (
                            <textarea
                              value={content}
                              onChange={(e) => {
                                const updated = { ...activeContent }
                                const posts = [...updated.socialContent.instagram]
                                posts[i] = { content: e.target.value, imageUrl: imageUrl }
                                updated.socialContent.instagram = posts
                                updated.updatedAt = new Date().toISOString()
                                setActiveContent(updated)
                              }}
                              onBlur={() => {
                                handleUpdateSocialPost('instagram', i, content)
                                setEditingPost(null)
                              }}
                              className="w-full p-2 border rounded text-xs"
                              rows={4}
                              autoFocus
                            />
                          ) : (
                            <div 
                              onClick={() => setEditingPost({ platform: 'instagram', index: i })}
                              className="mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                            >
                              {content}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleGenerateImage('instagram', i)}
                              disabled={generatingImage?.platform === 'instagram' && generatingImage?.index === i}
                              className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {generatingImage?.platform === 'instagram' && generatingImage?.index === i ? 'Generating...' : 'Image'}
                            </button>
                            <button
                              onClick={() => handleSchedulePost('instagram', i)}
                              className="flex-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded hover:from-purple-600 hover:to-pink-600"
                            >
                              Schedule
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {schedulingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Schedule Post</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
