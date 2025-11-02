'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, Lightbulb, ArrowRight, ChevronLeft, Clock, Edit3, Image as ImageIcon, X } from 'lucide-react'
import SocialPostModal from '@/components/content-studio/SocialPostModal'
import FormattingToolbar from '@/components/content-studio/FormattingToolbar'
import { supabase } from '@/lib/supabase'
import { useClientIntelligence, TrendingTopic } from '@/hooks/useClientIntelligence'

interface SocialPost {
  content: string
  imageUrl?: string
  scheduledAt?: string
  status?: 'draft' | 'scheduled' | 'published'
  documentId?: string
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
  const { clientData, trendingTopics, topicsLoading } = useClientIntelligence()
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
  const [selectedPost, setSelectedPost] = useState<{platform: string, index: number} | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

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
      const allPromises: Promise<{platform: string, content: string, error?: string | null}>[] = []
      
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
            }).then(async (res) => {
              if (!res.ok) {
                const errorText = await res.text().catch(() => 'Unknown error')
                console.error(`Failed to generate ${platform} post (attempt ${i + 1}):`, errorText)
                return { platform, content: '', error: errorText }
              }
              const data = await res.json()
              if (!data.content || !data.content.trim()) {
                console.warn(`Empty content returned for ${platform} post (attempt ${i + 1})`)
              }
              return { platform, content: data.content || '', error: null as string | null }
            })
            .catch((error) => {
              console.error(`Error generating ${platform} post (attempt ${i + 1}):`, error)
              return { platform, content: '', error: error.message || 'Unknown error' }
            })
          )
        }
      }
      
      const results = await Promise.all(allPromises)
      const socialContent: { twitter: SocialPost[], linkedin: SocialPost[], instagram: SocialPost[] } = {
        twitter: [],
        linkedin: [],
        instagram: []
      }

      // Track failures for reporting
      const failures: { platform: string; count: number }[] = []
      const failureCounts: Record<string, number> = {}

      results.forEach(result => {
        if (result.error) {
          failureCounts[result.platform] = (failureCounts[result.platform] || 0) + 1
        }
        if (result.content && result.content.trim() && result.platform in socialContent) {
          socialContent[result.platform as keyof typeof socialContent].push({
            content: result.content.trim(),
            imageUrl: undefined
          })
        }
      })

      // Report failures
      Object.entries(failureCounts).forEach(([platform, count]) => {
        if (count >= 2) {
          console.error(`[${platform.toUpperCase()}] Posts failed ${count} out of 3 attempts`)
          // Log the actual error messages for failed attempts
          results.filter(r => r.platform === platform && r.error).forEach((r, idx) => {
            console.error(`[${platform.toUpperCase()}] Failed attempt ${idx + 1}:`, r.error)
          })
        }
      })

      // If Twitter/X has no posts, show detailed warning
      if (socialContent.twitter.length === 0) {
        const twitterFailures = failureCounts['twitter'] || 0
        const allTwitterResults = results.filter(r => r.platform === 'twitter')
        const errorDetails = allTwitterResults
          .filter(r => r.error)
          .map((r, i) => `Attempt ${i + 1}: ${r.error || 'Empty content'}`)
          .join('\n')
        
        console.error('[TWITTER/X] All generation attempts failed. Details:', {
          totalAttempts: allTwitterResults.length,
          failures: twitterFailures,
          errors: errorDetails,
          results: allTwitterResults.map(r => ({
            hasContent: !!r.content,
            contentLength: r.content?.length || 0,
            error: r.error
          }))
        })
        
        alert(`Warning: Twitter/X posts failed to generate (${twitterFailures}/3 attempts failed).\n\nCheck the browser console for detailed error information.\n\nIf you see "empty content" errors, the AI may be generating content that gets filtered out during processing.`)
      }

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

  const renderMarkdownToHtml = (text: string): string => {
    if (!text) return ''
    
    let html = ''
    const lines = text.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.startsWith('# ')) {
        html += `<h1 class="text-3xl font-bold mt-6 mb-4">${escapeHtml(line.substring(2))}</h1>`
      } else if (line.startsWith('## ')) {
        html += `<h2 class="text-2xl font-bold mt-5 mb-3">${escapeHtml(line.substring(3))}</h2>`
      } else if (line.startsWith('### ')) {
        html += `<h3 class="text-xl font-bold mt-4 mb-2">${escapeHtml(line.substring(4))}</h3>`
      } else if (line.startsWith('#### ')) {
        html += `<h4 class="text-lg font-bold mt-3 mb-2">${escapeHtml(line.substring(5))}</h4>`
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        html += `<li class="ml-4 mb-1">${escapeHtml(line.substring(2))}</li>`
      } else if (line.trim() === '') {
        html += `<br />`
      } else {
        // Process inline markdown: **bold**, *italic*, `code`
        let processedLine = escapeHtml(line)
        processedLine = processedLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        processedLine = processedLine.replace(/\*(.+?)\*/g, '<em>$1</em>')
        processedLine = processedLine.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
        html += `<p class="mb-4">${processedLine}</p>`
      }
    }
    
    return html
  }

  const escapeHtml = (text: string): string => {
    if (typeof document === 'undefined') {
      // SSR fallback
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Initialize and update contenteditable when activeContent changes
  useEffect(() => {
    if (editorRef.current && activeContent && currentStep === 'longform-editor') {
      // Only update if the editor is not currently focused (user isn't typing)
      const isFocused = document.activeElement?.isSameNode(editorRef.current)
      if (!isFocused) {
        const html = renderMarkdownToHtml(activeContent.longFormContent)
        // Only update if content actually changed to avoid cursor jumps
        if (editorRef.current.innerHTML !== html) {
          editorRef.current.innerHTML = html
        }
      }
    }
  }, [activeContent?.id, currentStep])

  // Initialize content when switching to longform editor
  useEffect(() => {
    if (editorRef.current && activeContent && currentStep === 'longform-editor') {
      const html = renderMarkdownToHtml(activeContent.longFormContent)
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html
      }
    }
  }, [currentStep])

  const convertHtmlToMarkdown = (element: HTMLElement): string => {
    let markdown = ''
    const nodes = Array.from(element.childNodes)
    
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        markdown += node.textContent || ''
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tagName = el.tagName.toLowerCase()
        const text = el.textContent || ''
        
        if (tagName === 'h1') {
          markdown += `# ${text}\n\n`
        } else if (tagName === 'h2') {
          markdown += `## ${text}\n\n`
        } else if (tagName === 'h3') {
          markdown += `### ${text}\n\n`
        } else if (tagName === 'h4') {
          markdown += `#### ${text}\n\n`
        } else if (tagName === 'strong' || tagName === 'b') {
          markdown += `**${text}**`
        } else if (tagName === 'em' || tagName === 'i') {
          markdown += `*${text}*`
        } else if (tagName === 'code') {
          markdown += `\`${text}\``
        } else if (tagName === 'li') {
          markdown += `- ${text}\n`
        } else if (tagName === 'p') {
          // Check for inline formatting
          let pContent = ''
          const pNodes = Array.from(el.childNodes)
          for (const pNode of pNodes) {
            if (pNode.nodeType === Node.TEXT_NODE) {
              pContent += pNode.textContent || ''
            } else if (pNode.nodeType === Node.ELEMENT_NODE) {
              const pEl = pNode as HTMLElement
              if (pEl.tagName.toLowerCase() === 'strong') {
                pContent += `**${pEl.textContent || ''}**`
              } else if (pEl.tagName.toLowerCase() === 'em') {
                pContent += `*${pEl.textContent || ''}*`
              } else if (pEl.tagName.toLowerCase() === 'code') {
                pContent += `\`${pEl.textContent || ''}\``
              } else {
                pContent += pEl.textContent || ''
              }
            }
          }
          if (pContent.trim()) {
            markdown += pContent + '\n\n'
          }
        } else if (tagName === 'br') {
          markdown += '\n'
        } else {
          // Fallback: just get text content
          markdown += text
        }
      }
    }
    
    // Clean up extra newlines
    return markdown.replace(/\n{3,}/g, '\n\n').trim()
  }

  // Keep renderMarkdown for backwards compatibility if needed elsewhere
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
          <h1 className="text-xl font-semibold">The Forge</h1>
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
                <span>Back to Forge</span>
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
                  {topicsLoading ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="relative w-12 h-12 mb-4">
                          <Sparkles className="w-12 h-12 text-blue-600 animate-pulse" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Crafting Topics...</p>
                        <p className="text-xs text-gray-500 mt-1">Analyzing your content and profile</p>
                      </div>
                    </div>
                  ) : trendingTopics.length > 0 ? (
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
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div className="text-center py-6 text-sm text-gray-500">
                        <p>No topic suggestions available.</p>
                        <p className="text-xs mt-1">Complete your onboarding to get personalized suggestions.</p>
                      </div>
                    </div>
                  )}
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
              
              {/* Unified Editable Preview */}
              <div className="relative">
                <FormattingToolbar 
                  editorRef={editorRef} 
                  onFormat={(format) => {
                    // Format applied, content will be updated via onInput
                  }}
                />
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    // Debounce updates to avoid excessive re-renders
                    const markdown = convertHtmlToMarkdown(e.currentTarget)
                    if (markdown !== activeContent.longFormContent) {
                      setActiveContent({
                        ...activeContent,
                        longFormContent: markdown,
                        updatedAt: new Date().toISOString()
                      })
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure markdown is saved when user leaves the field
                    const markdown = convertHtmlToMarkdown(e.currentTarget)
                    if (markdown !== activeContent.longFormContent) {
                      const updated = {
                        ...activeContent,
                        longFormContent: markdown,
                        updatedAt: new Date().toISOString()
                      }
                      setActiveContent(updated)
                      autoSave(updated)
                    }
                  }}
                  className="w-full min-h-[600px] p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 prose max-w-none outline-none cursor-text"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(activeContent.longFormContent) }}
                />
                
                {/* Placeholder when empty */}
                {!activeContent.longFormContent && (
                  <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
                    Start writing your content... (Supports markdown: # headers, **bold**, - lists)
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>{activeContent.longFormContent.split(/\s+/).filter(w => w.length > 0).length} words</span>
                <span className="text-xs text-gray-500">Edit directly in the preview above</span>
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
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Social Media Posts</h2>
                <p className="text-gray-600">Generated from: {activeContent.title}</p>
              </div>
              <button
                onClick={() => setCurrentStep('longform-editor')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Longform</span>
              </button>
            </div>

            {/* All posts in a unified card grid - grouped by platform */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* X/Twitter Posts */}
              {activeContent.socialContent.twitter.map((post, i) => {
                const content = typeof post === 'string' ? post : post.content
                const imageUrl = typeof post === 'object' ? post.imageUrl : undefined
                const scheduledAt = typeof post === 'object' ? post.scheduledAt : undefined
                const status = typeof post === 'object' ? post.status : undefined
                const isScheduled = status === 'scheduled' || scheduledAt !== undefined
                
                return (
                  <motion.div
                    key={`twitter-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedPost({ platform: 'twitter', index: i })}
                    className={`bg-white rounded-xl shadow-md border p-5 cursor-pointer hover:shadow-lg transition-all group ${
                      isScheduled ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-sky-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          ✖
                        </div>
                        <span className="text-sm font-semibold text-gray-700">X (Twitter)</span>
                      </div>
                      {isScheduled && (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-500 text-white rounded-full flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Scheduled</span>
                        </span>
                      )}
                    </div>
                    {imageUrl ? (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        <img src={imageUrl} alt="" className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="mb-3 h-40 bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-sky-300 opacity-50" />
                      </div>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-3 mb-3">{content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{content.length} chars</span>
                      <span className={`${content.length > 250 ? 'text-red-500 font-medium' : content.length > 230 ? 'text-orange-500' : 'text-green-600'}`}>
                        {250 - content.length} remaining
                      </span>
                    </div>
                  </motion.div>
                )
              })}

              {/* LinkedIn Posts */}
              {activeContent.socialContent.linkedin.map((post, i) => {
                const content = typeof post === 'string' ? post : post.content
                const imageUrl = typeof post === 'object' ? post.imageUrl : undefined
                const scheduledAt = typeof post === 'object' ? post.scheduledAt : undefined
                const status = typeof post === 'object' ? post.status : undefined
                const isScheduled = status === 'scheduled' || scheduledAt !== undefined
                
                return (
                  <motion.div
                    key={`linkedin-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (activeContent.socialContent.twitter.length + i) * 0.1 }}
                    onClick={() => setSelectedPost({ platform: 'linkedin', index: i })}
                    className={`bg-white rounded-xl shadow-md border p-5 cursor-pointer hover:shadow-lg transition-all group ${
                      isScheduled ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          in
                        </div>
                        <span className="text-sm font-semibold text-gray-700">LinkedIn</span>
                      </div>
                      {isScheduled && (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-500 text-white rounded-full flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Scheduled</span>
                        </span>
                      )}
                    </div>
                    {imageUrl ? (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        <img src={imageUrl} alt="" className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="mb-3 h-40 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-blue-300 opacity-50" />
                      </div>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-4 mb-3">{content}</p>
                    <div className="text-xs text-gray-500">
                      {content.length} characters
                    </div>
                  </motion.div>
                )
              })}

              {/* Instagram Posts */}
              {activeContent.socialContent.instagram.map((post, i) => {
                const content = typeof post === 'string' ? post : post.content
                const imageUrl = typeof post === 'object' ? post.imageUrl : undefined
                const scheduledAt = typeof post === 'object' ? post.scheduledAt : undefined
                const status = typeof post === 'object' ? post.status : undefined
                const isScheduled = status === 'scheduled' || scheduledAt !== undefined
                
                return (
                  <motion.div
                    key={`instagram-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (activeContent.socialContent.twitter.length + activeContent.socialContent.linkedin.length + i) * 0.1 }}
                    onClick={() => setSelectedPost({ platform: 'instagram', index: i })}
                    className={`bg-white rounded-xl shadow-md border p-5 cursor-pointer hover:shadow-lg transition-all group ${
                      isScheduled ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          IG
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Instagram</span>
                      </div>
                      {isScheduled && (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-500 text-white rounded-full flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Scheduled</span>
                        </span>
                      )}
                    </div>
                    {imageUrl ? (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        <img src={imageUrl} alt="" className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="mb-3 h-40 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-pink-300 opacity-50" />
                      </div>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-4 mb-3">{content}</p>
                    <div className="text-xs text-gray-500">
                      {content.length} characters
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Social Post Modal */}
      {selectedPost && activeContent && (() => {
        const platformContent = activeContent.socialContent[selectedPost.platform as keyof typeof activeContent.socialContent]
        const post = platformContent[selectedPost.index]
        const postContent = typeof post === 'string' ? post : post.content
        const postImageUrl = typeof post === 'object' ? post.imageUrl : undefined
        
        return (
          <SocialPostModal
            isOpen={selectedPost !== null}
            onClose={() => setSelectedPost(null)}
            post={{ content: postContent, imageUrl: postImageUrl }}
            platform={selectedPost.platform}
            onEdit={(newContent) => {
              handleUpdateSocialPost(selectedPost.platform, selectedPost.index, newContent)
            }}
            onSchedule={async (date, time) => {
              if (!activeContent) return
              
              const platformContent = activeContent.socialContent[selectedPost.platform as keyof typeof activeContent.socialContent]
              const post = platformContent[selectedPost.index]
              const postContent = typeof post === 'string' ? post : post.content
              const postImageUrl = typeof post === 'object' ? post.imageUrl : undefined
              const scheduledDateTime = new Date(`${date}T${time}`).toISOString()

              try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('Not authenticated')

                const { data: teamData } = await supabase
                  .from('team_members')
                  .select('team_id')
                  .eq('user_id', user.id)
                  .single()

                if (!teamData) throw new Error('No team found')

                // Check if this post already exists in the database
                const { data: existingPosts } = await supabase
                  .from('content_documents')
                  .select('id, status')
                  .eq('team_id', teamData.team_id)
                  .eq('platform', selectedPost.platform)
                  .eq('content', postContent)
                  .limit(1)

                let status = 'scheduled' // Default for new posts
                let documentId: string | null = null

                if (existingPosts && existingPosts.length > 0) {
                  // Update existing post - preserve status if already published
                  documentId = existingPosts[0].id
                  status = existingPosts[0].status === 'published' ? 'published' : 'scheduled'
                  
                  const { error: updateError } = await supabase
                    .from('content_documents')
                    .update({
                      status: status,
                      metadata: {
                        scheduled_at: scheduledDateTime,
                        image_url: postImageUrl
                      },
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', documentId)

                  if (updateError) throw updateError
                } else {
                  // Create new post
                  const { data: newPost, error: insertError } = await supabase
                    .from('content_documents')
                    .insert([{
                      team_id: teamData.team_id,
                      title: `${selectedPost.platform.charAt(0).toUpperCase() + selectedPost.platform.slice(1)} post from: ${activeContent.title}`,
                      content: postContent,
                      platform: selectedPost.platform,
                      created_by: user.id,
                      status: 'scheduled',
                      metadata: {
                        scheduled_at: scheduledDateTime,
                        image_url: postImageUrl
                      }
                    }])
                    .select('id')
                    .single()

                  if (insertError) throw insertError
                  documentId = newPost?.id || null
                }

                if (documentId) {
                  // Update the post in activeContent to show scheduled status
                  const updatedSocialContent = { ...activeContent.socialContent }
                  const platformPosts = updatedSocialContent[selectedPost.platform as keyof typeof updatedSocialContent]
                  if (Array.isArray(platformPosts) && platformPosts[selectedPost.index]) {
                    if (typeof platformPosts[selectedPost.index] === 'object') {
                      platformPosts[selectedPost.index] = {
                        ...platformPosts[selectedPost.index],
                        scheduledAt: scheduledDateTime,
                        status: status as 'draft' | 'scheduled' | 'published',
                        documentId: documentId
                      }
                    } else {
                      const existingContent = typeof platformPosts[selectedPost.index] === 'string' 
                        ? platformPosts[selectedPost.index] 
                        : (platformPosts[selectedPost.index] as SocialPost).content
                      platformPosts[selectedPost.index] = {
                        content: existingContent as string,
                        scheduledAt: scheduledDateTime,
                        status: status as 'draft' | 'scheduled' | 'published',
                        documentId: documentId
                      }
                    }
                  }
                  
                  setActiveContent({
                    ...activeContent,
                    socialContent: updatedSocialContent
                  })
                  
                  // Auto-save the updated content
                  await autoSave({
                    ...activeContent,
                    socialContent: updatedSocialContent
                  })
                  
                  alert(`Post ${existingPosts && existingPosts.length > 0 ? 'updated and' : ''} scheduled for ${date} at ${time}! Status: ${status}`)
                  setSelectedPost(null)
                } else {
                  throw new Error('Failed to create or update post')
                }
              } catch (error) {
                alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
              }
            }}
            onGenerateImage={() => {
              handleGenerateImage(selectedPost.platform, selectedPost.index)
            }}
            isGeneratingImage={generatingImage?.platform === selectedPost.platform && generatingImage?.index === selectedPost.index}
          />
        )
      })()}

      {/* Schedule Modal (keep for backward compatibility) */}
      {schedulingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-md flex items-center justify-center z-50">
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
