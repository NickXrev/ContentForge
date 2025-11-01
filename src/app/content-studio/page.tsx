'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Edit3, X, Image as ImageIcon, Clock, ChevronLeft } from 'lucide-react'
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

export default function ContentStudioPage() {
  const { clientData, trendingTopics } = useClientIntelligence()
  const [generatedContent, setGeneratedContent] = useState<ContentPiece | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null)
  const [customTopic, setCustomTopic] = useState('')
  const [loadingDraft, setLoadingDraft] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingImage, setGeneratingImage] = useState<{platform: string, index: number} | null>(null)
  const [editingPost, setEditingPost] = useState<{platform: string, index: number, content: string} | null>(null)
  const [schedulingPost, setSchedulingPost] = useState<{platform: string, index: number} | null>(null)
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' })
  const [showSocialSidebar, setShowSocialSidebar] = useState(false)

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

      const { data: teamMemberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (!teamMemberData) {
        setLoadingDraft(false)
        return
      }

      const { data: documents } = await supabase
        .from('content_documents')
        .select('*')
        .eq('team_id', teamMemberData.team_id)
        .eq('status', 'draft')
        .eq('platform', 'blog')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (!documents || documents.length === 0) {
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
      if (content.socialContent && (
        content.socialContent.twitter.length > 0 ||
        content.socialContent.linkedin.length > 0 ||
        content.socialContent.instagram.length > 0
      )) {
        setShowSocialSidebar(true)
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    } finally {
      setLoadingDraft(false)
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
        const { data } = await supabase
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

  useEffect(() => {
    if (!generatedContent || !generatedContent.documentId) return
    const timer = setTimeout(() => {
      autoSave(generatedContent, true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [generatedContent?.longFormContent, generatedContent?.socialContent])

  const handleGenerate = async () => {
    const topic = selectedTopic || { topic: customTopic, keywords: [], content_angle: '', target_audience: clientData?.target_audience || '' }
    if (!topic.topic.trim()) return
    
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const titleMatch = longFormContent.match(/^#\s*(.+)$/m) || longFormContent.match(/^(.+)$/m)
      const title = titleMatch ? titleMatch[1].replace(/^#+\s*/, '') : `${topic.topic}: A Guide`

      const newContent: ContentPiece = {
        id: `content-${Date.now()}`,
        title: title,
        topic: topic.topic,
        targetAudience: clientData?.target_audience || '',
        contentLength: 'long',
        tone: (clientData?.brand_tone as any) || 'professional',
        keywords: topic.keywords || [],
        longFormContent: longFormContent,
        socialContent: { twitter: [], linkedin: [], instagram: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft'
      }

      setGeneratedContent(newContent)
      await autoSave(newContent)
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateSocial = async () => {
    if (!generatedContent) return
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
            }).then(res => res.ok ? res.json() : { content: '' }).then(data => ({ platform, content: data.content || '' }))
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

      setGeneratedContent({
        ...generatedContent,
        socialContent: socialContent,
        updatedAt: new Date().toISOString()
      })
      setShowSocialSidebar(true)
      await autoSave({ ...generatedContent, socialContent })
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUpdateSocialPost = (platform: string, index: number, newContent: string) => {
    if (!generatedContent) return
    const updated = { ...generatedContent.socialContent }
    const posts = [...updated[platform as keyof typeof updated]]
    const current = posts[index]
    posts[index] = {
      content: newContent,
      imageUrl: typeof current === 'object' ? current.imageUrl : undefined
    }
    updated[platform as keyof typeof updated] = posts as any
    setGeneratedContent({
      ...generatedContent,
      socialContent: updated,
      updatedAt: new Date().toISOString()
    })
    setEditingPost(null)
  }

  const handleGenerateImage = async (platform: string, index: number) => {
    if (!generatedContent) return
    setGeneratingImage({ platform, index })
    
    try {
      const posts = generatedContent.socialContent[platform as keyof typeof generatedContent.socialContent]
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

      if (!response.ok) throw new Error('Failed to generate image')
      const { imageUrl } = await response.json()
      
      const updated = { ...generatedContent.socialContent }
      const platformPosts = [...updated[platform as keyof typeof updated]]
      platformPosts[index] = {
        content: typeof platformPosts[index] === 'string' ? platformPosts[index] : platformPosts[index].content,
        imageUrl: imageUrl
      }
      updated[platform as keyof typeof updated] = platformPosts as any
      
      setGeneratedContent({
        ...generatedContent,
        socialContent: updated,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeneratingImage(null)
    }
  }

  const handleSchedulePost = async (platform: string, index: number) => {
    if (!generatedContent) return
    const post = generatedContent.socialContent[platform as keyof typeof generatedContent.socialContent][index]
    const postContent = typeof post === 'string' ? post : post.content
    const postImageUrl = typeof post === 'object' ? post.imageUrl : undefined
    
    const scheduledDateTime = prompt('Enter date and time (YYYY-MM-DD HH:MM):')
    if (!scheduledDateTime) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (!teamData) throw new Error('No team found')

      await supabase.from('content_documents').insert([{
        team_id: teamData.team_id,
        title: `Scheduled ${platform} post`,
        content: postContent,
        platform: platform,
        created_by: user.id,
        status: 'scheduled',
        metadata: {
          scheduled_at: new Date(scheduledDateTime).toISOString(),
          image_url: postImageUrl
        }
      }])

      alert('Post scheduled!')
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loadingDraft) {
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
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Content Studio</h1>
          <div className="flex items-center space-x-3">
            {saving && <span className="text-sm text-gray-500">Saving...</span>}
            {generatedContent && (
              <>
                {!showSocialSidebar && (
                  <button
                    onClick={handleGenerateSocial}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Social Posts'}
                  </button>
                )}
                <button
                  onClick={() => setShowSocialSidebar(!showSocialSidebar)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                >
                  {showSocialSidebar ? 'Hide Social' : 'Show Social'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor */}
        <div className={`flex-1 overflow-auto transition-all duration-300 ${showSocialSidebar ? 'mr-80' : ''}`}>
          {!generatedContent ? (
            <div className="max-w-2xl mx-auto px-6 py-12">
              <div className="bg-white rounded-lg shadow p-8">
                <h2 className="text-2xl font-semibold mb-6">Create New Content</h2>
                
                {trendingTopics && trendingTopics.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Trending Topics</h3>
                    <div className="space-y-2">
                      {trendingTopics.map((topic, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedTopic(topic)}
                          className={`w-full p-3 text-left border rounded-lg ${
                            selectedTopic === topic ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="font-medium">{topic.topic}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Or enter custom topic</label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Enter topic..."
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!selectedTopic && !customTopic.trim())}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-8">
              <textarea
                value={generatedContent.longFormContent}
                onChange={(e) => {
                  setGeneratedContent({
                    ...generatedContent,
                    longFormContent: e.target.value,
                    updatedAt: new Date().toISOString()
                  })
                }}
                className="w-full h-[calc(100vh-200px)] p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                placeholder="Your content..."
              />
            </div>
          )}
        </div>

        {/* Social Posts Sidebar */}
        {showSocialSidebar && generatedContent && (
          <div className="w-80 bg-white border-l overflow-auto">
            <div className="p-4 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Social Posts</h3>
                <button onClick={() => setShowSocialSidebar(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Twitter */}
              {generatedContent.socialContent.twitter.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-blue-400 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">T</span>
                    </div>
                    <h4 className="font-medium text-sm">Twitter</h4>
                  </div>
                  <div className="space-y-3">
                    {generatedContent.socialContent.twitter.map((post, i) => {
                      const content = typeof post === 'string' ? post : post.content
                      const imageUrl = typeof post === 'object' ? post.imageUrl : undefined
                      const isEditing = editingPost?.platform === 'twitter' && editingPost?.index === i
                      
                      return (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                          {imageUrl && <img src={imageUrl} alt="" className="w-full h-24 object-cover rounded mb-2" />}
                          {isEditing ? (
                            <textarea
                              value={editingPost.content}
                              onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                              onBlur={() => handleUpdateSocialPost('twitter', i, editingPost.content)}
                              className="w-full p-2 border rounded text-xs"
                              rows={3}
                              autoFocus
                            />
                          ) : (
                            <div 
                              onClick={() => setEditingPost({ platform: 'twitter', index: i, content })}
                              className="mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                            >
                              {content}
                            </div>
                          )}
                          <div className="flex gap-1">
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
              {generatedContent.socialContent.linkedin.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-blue-700 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">in</span>
                    </div>
                    <h4 className="font-medium text-sm">LinkedIn</h4>
                  </div>
                  <div className="space-y-3">
                    {generatedContent.socialContent.linkedin.map((post, i) => {
                      const content = typeof post === 'string' ? post : post.content
                      const imageUrl = typeof post === 'object' ? post.imageUrl : undefined
                      const isEditing = editingPost?.platform === 'linkedin' && editingPost?.index === i
                      
                      return (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                          {imageUrl && <img src={imageUrl} alt="" className="w-full h-24 object-cover rounded mb-2" />}
                          {isEditing ? (
                            <textarea
                              value={editingPost.content}
                              onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                              onBlur={() => handleUpdateSocialPost('linkedin', i, editingPost.content)}
                              className="w-full p-2 border rounded text-xs"
                              rows={4}
                              autoFocus
                            />
                          ) : (
                            <div 
                              onClick={() => setEditingPost({ platform: 'linkedin', index: i, content })}
                              className="mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                            >
                              {content}
                            </div>
                          )}
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleGenerateImage('linkedin', i)}
                              disabled={generatingImage?.platform === 'linkedin' && generatingImage?.index === i}
                              className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                            >
                              Image
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
              {generatedContent.socialContent.instagram.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">IG</span>
                    </div>
                    <h4 className="font-medium text-sm">Instagram</h4>
                  </div>
                  <div className="space-y-3">
                    {generatedContent.socialContent.instagram.map((post, i) => {
                      const content = typeof post === 'string' ? post : post.content
                      const imageUrl = typeof post === 'object' ? post.imageUrl : undefined
                      const isEditing = editingPost?.platform === 'instagram' && editingPost?.index === i
                      
                      return (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                          {imageUrl && <img src={imageUrl} alt="" className="w-full h-24 object-cover rounded mb-2" />}
                          {isEditing ? (
                            <textarea
                              value={editingPost.content}
                              onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                              onBlur={() => handleUpdateSocialPost('instagram', i, editingPost.content)}
                              className="w-full p-2 border rounded text-xs"
                              rows={4}
                              autoFocus
                            />
                          ) : (
                            <div 
                              onClick={() => setEditingPost({ platform: 'instagram', index: i, content })}
                              className="mb-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                            >
                              {content}
                            </div>
                          )}
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleGenerateImage('instagram', i)}
                              disabled={generatingImage?.platform === 'instagram' && generatingImage?.index === i}
                              className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                            >
                              Image
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
    </div>
  )
}
