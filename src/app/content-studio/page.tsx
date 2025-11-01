'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Sparkles, Target, Users, Calendar, Save, Download, Share2, Edit3, Trash2, Clock, ChevronLeft, ChevronRight, TrendingUp, Lightbulb, Zap, ArrowRight, X, Image as ImageIcon, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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
  documentId?: string // Database ID
}

export default function ContentStudioPage() {
  const { clientData, trendingTopics, loading: intelligenceLoading } = useClientIntelligence()
  const [generatedContent, setGeneratedContent] = useState<ContentPiece | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null)
  const [customTopic, setCustomTopic] = useState('')
  const [showTopicSelector, setShowTopicSelector] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingImage, setGeneratingImage] = useState<{platform: string, index: number} | null>(null)
  const [showSocialPosts, setShowSocialPosts] = useState(false)
  const [viewingPost, setViewingPost] = useState<{platform: string, index: number, content: string} | null>(null)
  const [schedulingPost, setSchedulingPost] = useState<{platform: string, index: number} | null>(null)
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    platforms: [] as string[]
  })

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

      // Get user's team
      const { data: teamMemberData, error: teamMemberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (teamMemberError || !teamMemberData) {
        setLoadingDraft(false)
        return
      }

      // Get most recent draft for this team
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
      
      // Reconstruct ContentPiece from database
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
      // If there are social posts, show them
      if (content.socialContent && (
        content.socialContent.twitter.length > 0 ||
        content.socialContent.linkedin.length > 0 ||
        content.socialContent.instagram.length > 0
      )) {
        setShowSocialPosts(true)
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

      // Get user's team
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
        // Update existing
        const { error } = await supabase
          .from('content_documents')
          .update(updateData)
          .eq('id', content.documentId)

        if (error) throw error
      } else {
        // Insert new
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
      if (!silent) {
        alert('Failed to auto-save. Changes may be lost if you navigate away.')
      }
    } finally {
      setSaving(false)
    }
  }

  // Auto-save on content change (debounced)
  useEffect(() => {
    if (!generatedContent || !generatedContent.documentId) return

    const timer = setTimeout(() => {
      autoSave(generatedContent, true)
    }, 2000) // Save 2 seconds after last change

    return () => clearTimeout(timer)
  }, [generatedContent?.longFormContent])

  const handleGenerate = async () => {
    const topic = selectedTopic || { topic: customTopic, keywords: [], content_angle: '', target_audience: clientData?.target_audience || 'your audience' }
    if (!topic.topic.trim()) return
    
    setIsGenerating(true)
    setShowTopicSelector(false)
    
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

      const newContent: ContentPiece = {
        id: `content-${Date.now()}`,
        title: title,
        topic: topic.topic,
        targetAudience: clientData?.target_audience || '',
        contentLength: 'long',
        tone: (clientData?.brand_tone as 'professional' | 'casual' | 'authoritative' | 'conversational') || 'professional',
        keywords: topic.keywords || [],
        longFormContent: longFormContent,
        socialContent: socialContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft'
      }

      setGeneratedContent(newContent)
      
      // Auto-save immediately
      await autoSave(newContent)
    } catch (error) {
      console.error('Error generating content:', error)
      alert(`Error generating content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
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
      setShowSocialPosts(true)
      
      // Auto-save with social posts
      await autoSave(updatedContent)
    } catch (error) {
      console.error('Error generating social content:', error)
      alert(`Error generating social posts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
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
      
      const updatedContent = {
        ...generatedContent,
        socialContent: updatedSocialContent,
        updatedAt: new Date().toISOString()
      }

      setGeneratedContent(updatedContent)
      await autoSave(updatedContent)
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

  const handleNewContent = () => {
    if (confirm('Start new content? Your current work will be saved automatically.')) {
      setGeneratedContent(null)
      setShowTopicSelector(true)
      setShowSocialPosts(false)
      setSelectedTopic(null)
      setCustomTopic('')
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
            <p className="text-sm text-gray-600 mt-1">
              {generatedContent ? `Editing: ${generatedContent.title}` : 'Create and edit your content'}
              {saving && <span className="ml-2 text-blue-600">• Saving...</span>}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {generatedContent && (
              <>
                <button
                  onClick={handleNewContent}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Content</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {!generatedContent ? (
          // Topic Selection / Generation
          <div className="max-w-4xl mx-auto px-6 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
            >
              <h2 className="text-xl font-semibold mb-6">Start Creating Content</h2>
              
              {showTopicSelector && (
                <div className="space-y-6">
                  {/* Trending Topics */}
                  {trendingTopics && trendingTopics.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Trending Topics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trendingTopics.map((topic, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedTopic(topic)}
                            className={`p-4 text-left border rounded-lg transition-colors ${
                              selectedTopic === topic
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium text-gray-900">{topic.topic}</div>
                            {topic.content_angle && (
                              <div className="text-sm text-gray-600 mt-1">{topic.content_angle}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Topic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Or enter your own topic
                    </label>
                    <input
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="Enter a topic for your content..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || (!selectedTopic && !customTopic.trim())}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Generating Content...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Generate Content</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {!showTopicSelector && (
                <button
                  onClick={() => setShowTopicSelector(true)}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Content</span>
                </button>
              )}
            </motion.div>
          </div>
        ) : (
          // Content Editor View
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content Editor */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Long-Form Content</h2>
                    <button
                      onClick={() => {
                        const newContent = prompt('Enter new title:', generatedContent.title) || generatedContent.title
                        setGeneratedContent({ ...generatedContent, title: newContent })
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Edit3 className="w-4 h-4 inline mr-1" />
                      Edit Title
                    </button>
                  </div>
                  
                  <textarea
                    value={generatedContent.longFormContent}
                    onChange={(e) => {
                      setGeneratedContent({
                        ...generatedContent,
                        longFormContent: e.target.value,
                        updatedAt: new Date().toISOString()
                      })
                    }}
                    className="w-full h-[600px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Your content will appear here..."
                  />
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Word count: {generatedContent.longFormContent.split(/\s+/).filter(word => word.length > 0).length}
                    </div>
                    <div className="flex space-x-2">
                      {!showSocialPosts && (
                        <button
                          onClick={handleGenerateSocial}
                          disabled={isGenerating}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                          {isGenerating ? 'Generating...' : 'Generate Social Posts'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">Preview</h3>
                  <div className="prose max-w-none">
                    {renderMarkdown(generatedContent.longFormContent)}
                  </div>
                </div>
              </div>

              {/* Social Posts Sidebar */}
              <div className="space-y-6">
                {showSocialPosts && generatedContent.socialContent && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4">Social Media Posts</h3>
                    
                    {/* Twitter */}
                    {generatedContent.socialContent.twitter.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">T</span>
                          </div>
                          <h4 className="font-semibold">Twitter</h4>
                        </div>
                        <div className="space-y-3">
                          {generatedContent.socialContent.twitter.map((post, index) => {
                            const postContent = typeof post === 'string' ? post : post.content
                            const postImage = typeof post === 'object' ? post.imageUrl : undefined
                            const isGeneratingImg = generatingImage?.platform === 'twitter' && generatingImage?.index === index
                            return (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                                {postImage && (
                                  <img src={postImage} alt="Post image" className="w-full h-32 object-cover rounded mb-2" />
                                )}
                                <div className="mb-2">{postContent}</div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleGenerateImage('twitter', index)}
                                    disabled={isGeneratingImg}
                                    className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    {isGeneratingImg ? '...' : 'Image'}
                                  </button>
                                  <button
                                    onClick={() => handleSchedulePost('twitter', index)}
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
                    {generatedContent.socialContent.linkedin.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">in</span>
                          </div>
                          <h4 className="font-semibold">LinkedIn</h4>
                        </div>
                        <div className="space-y-3">
                          {generatedContent.socialContent.linkedin.map((post, index) => {
                            const postContent = typeof post === 'string' ? post : post.content
                            const postImage = typeof post === 'object' ? post.imageUrl : undefined
                            const isGeneratingImg = generatingImage?.platform === 'linkedin' && generatingImage?.index === index
                            return (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                                {postImage && (
                                  <img src={postImage} alt="Post image" className="w-full h-32 object-cover rounded mb-2" />
                                )}
                                <div className="mb-2">{postContent}</div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleGenerateImage('linkedin', index)}
                                    disabled={isGeneratingImg}
                                    className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    {isGeneratingImg ? '...' : 'Image'}
                                  </button>
                                  <button
                                    onClick={() => handleSchedulePost('linkedin', index)}
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
                    {generatedContent.socialContent.instagram.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">IG</span>
                          </div>
                          <h4 className="font-semibold">Instagram</h4>
                        </div>
                        <div className="space-y-3">
                          {generatedContent.socialContent.instagram.map((post, index) => {
                            const postContent = typeof post === 'string' ? post : post.content
                            const postImage = typeof post === 'object' ? post.imageUrl : undefined
                            const isGeneratingImg = generatingImage?.platform === 'instagram' && generatingImage?.index === index
                            return (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                                {postImage && (
                                  <img src={postImage} alt="Post image" className="w-full h-32 object-cover rounded mb-2" />
                                )}
                                <div className="mb-2">{postContent}</div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleGenerateImage('instagram', index)}
                                    disabled={isGeneratingImg}
                                    className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    {isGeneratingImg ? '...' : 'Image'}
                                  </button>
                                  <button
                                    onClick={() => handleSchedulePost('instagram', index)}
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
                )}
              </div>
            </div>
          </div>
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
