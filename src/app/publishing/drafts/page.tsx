'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { 
  FileText, 
  Edit, 
  Trash2, 
  Eye,
  Search,
  Filter,
  Calendar,
  Globe,
  Copy,
  MoreVertical,
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface ContentDocument {
  id: string
  title: string
  content: string
  team_id: string
  created_by: string
  created_at: string
  updated_at: string
  status: string
  category?: string
  platform?: string
  topic?: string
  tone?: string
  word_count?: number
  metadata?: any
}

export default function DraftsPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<ContentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [selectedDoc, setSelectedDoc] = useState<ContentDocument | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchTeamAndDocuments()
    }
  }, [user])

  const fetchTeamAndDocuments = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Get user from public.users table first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (userError || !userData) {
        setError('User not found in database')
        return
      }

      // Get user's team
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (teamsError || !teamsData || teamsData.length === 0) {
        setError('No team found. Please complete your profile setup first.')
        return
      }

      const currentTeamId = teamsData[0].id
      setTeamId(currentTeamId)

      // Fetch content documents
      await loadDocuments(currentTeamId)
    } catch (err) {
      console.error('Error fetching team:', err)
      setError('Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  const loadDocuments = async (teamId: string) => {
    try {
      let query = supabase
        .from('content_documents')
        .select('*')
        .eq('team_id', teamId)
        .order('updated_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      if (filterPlatform !== 'all' && filterPlatform) {
        query = query.eq('platform', filterPlatform)
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading documents:', error)
        setError(`Error loading content: ${error.message}`)
        return
      }

      setDocuments(data || [])
    } catch (err) {
      console.error('Error loading documents:', err)
      setError('Failed to load content')
    }
  }

  useEffect(() => {
    if (teamId) {
      loadDocuments(teamId)
    }
  }, [filterStatus, filterPlatform, searchTerm, teamId])

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return

    try {
      const { error } = await supabase
        .from('content_documents')
        .delete()
        .eq('id', documentId)

      if (error) {
        console.error('Error deleting document:', error)
        alert('Failed to delete content')
        return
      }

      // Reload documents
      if (teamId) {
        await loadDocuments(teamId)
      }
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('Failed to delete content')
    }
  }

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      alert('Content copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'review':
        return 'bg-yellow-100 text-yellow-800'
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlatformIcon = (platform?: string) => {
    if (!platform) return <Globe className="w-4 h-4" />
    const platformLower = platform.toLowerCase()
    if (platformLower.includes('twitter') || platformLower.includes('x')) {
      return <span className="text-xs font-bold">X</span>
    }
    if (platformLower.includes('linkedin')) {
      return <span className="text-xs font-bold">LI</span>
    }
    if (platformLower.includes('instagram')) {
      return <span className="text-xs font-bold">IG</span>
    }
    return <Globe className="w-4 h-4" />
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (!content) return ''
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  const uniquePlatforms = Array.from(new Set(documents.map(doc => doc.platform).filter(Boolean)))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error && documents.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" /> Content
        </h1>
        <p className="text-gray-600 mt-1">View and manage all your generated content</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Platform Filter */}
          {uniquePlatforms.length > 0 && (
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Platforms</option>
                {uniquePlatforms.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content List */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all' || filterPlatform !== 'all'
              ? 'Try adjusting your filters'
              : 'Generate your first piece of content in the Content Studio'}
          </p>
          {(!searchTerm && filterStatus === 'all' && filterPlatform === 'all') && (
            <Link
              href="/content-studio"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Content Studio
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {doc.platform && (
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          {getPlatformIcon(doc.platform)}
                        </div>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    {doc.platform && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        {doc.platform}
                      </span>
                    )}
                    {doc.topic && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {doc.topic}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </span>
                    {doc.word_count && (
                      <span>{doc.word_count} words</span>
                    )}
                  </div>

                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {truncateContent(doc.content)}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <Link
                    href={`/editor?id=${doc.id}`}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => handleCopyContent(doc.content)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedDoc.title}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  {selectedDoc.platform && <span>Platform: {selectedDoc.platform}</span>}
                  {selectedDoc.status && <span>Status: {selectedDoc.status}</span>}
                  <span>Updated: {new Date(selectedDoc.updated_at).toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-gray-800 font-sans">{selectedDoc.content}</pre>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  handleCopyContent(selectedDoc.content)
                  setSelectedDoc(null)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <Link
                href={`/editor?id=${selectedDoc.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                onClick={() => setSelectedDoc(null)}
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

