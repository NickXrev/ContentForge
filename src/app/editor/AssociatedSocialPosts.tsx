'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SocialPostModal from '@/components/content-studio/SocialPostModal'
import { Calendar, Image as ImageIcon, ExternalLink } from 'lucide-react'

export default function AssociatedSocialPosts({ parentId, parentTitle, teamId }: { parentId: string; parentTitle: string; teamId: string }) {
  const [posts, setPosts] = useState<any[]>([])
  const [selected, setSelected] = useState<{ platform: string; index: number } | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      // Prefer explicit link
      const byLink = await supabase
        .from('content_documents')
        .select('id, title, content, platform, status, metadata, updated_at')
        .eq('team_id', teamId)
        .neq('platform', 'blog')
        .contains('metadata', { source_document_id: parentId })

      if (byLink.data && byLink.data.length > 0) {
        setPosts(byLink.data)
        return
      }

      // Fallback by title match (legacy)
      const byTitle = await supabase
        .from('content_documents')
        .select('id, title, content, platform, status, metadata, updated_at')
        .eq('team_id', teamId)
        .neq('platform', 'blog')
        .ilike('title', `%${parentTitle}%`)
        .order('updated_at', { ascending: false })
        .limit(30)

      setPosts(byTitle.data || [])
    }
    fetchPosts()
  }, [parentId, parentTitle, teamId])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Associated Social Posts</h3>
        <a href="/publishing/drafts" className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1">
          <span>View all</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-gray-500">No associated posts found.</p>
      ) : (
        <div className="space-y-2">
          {posts.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelected({ platform: p.platform, index: i })}
              className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition flex items-start space-x-3"
            >
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                {p.platform === 'instagram' ? <ImageIcon className="w-4 h-4 text-pink-500" /> : <Calendar className="w-4 h-4 text-gray-500" />}
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 capitalize">{p.platform} • {p.status}</div>
                <div className="text-sm text-gray-900 line-clamp-2">{p.content}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && posts[selected.index] && (
        <SocialPostModal
          isOpen={true}
          onClose={() => setSelected(null)}
          platform={selected.platform}
          post={{ content: posts[selected.index].content, imageUrl: posts[selected.index].metadata?.image_url }}
          onEdit={async (newContent) => {
            const doc = posts[selected.index]
            await supabase.from('content_documents').update({
              content: newContent,
              updated_at: new Date().toISOString()
            }).eq('id', doc.id)
            const updated = [...posts]
            updated[selected.index] = { ...doc, content: newContent }
            setPosts(updated)
          }}
          onSchedule={async (date, time) => {
            const doc = posts[selected.index]
            const scheduled = new Date(`${date}T${time}`).toISOString()
            await supabase.from('content_documents').update({
              status: 'scheduled',
              metadata: { ...(doc.metadata || {}), scheduled_at: scheduled },
              updated_at: new Date().toISOString()
            }).eq('id', doc.id)
            const updated = [...posts]
            updated[selected.index] = { ...doc, status: 'scheduled', metadata: { ...(doc.metadata || {}), scheduled_at: scheduled } }
            setPosts(updated)
          }}
          onGenerateImage={async () => {}}
          isGeneratingImage={false}
        />
      )}
    </div>
  )
}


