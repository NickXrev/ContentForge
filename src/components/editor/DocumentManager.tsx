'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { 
  Plus, 
  FileText, 
  Calendar, 
  Users, 
  Edit, 
  Trash2, 
  Eye,
  Search,
  Filter,
  SortAsc,
  MoreVertical
} from 'lucide-react'

interface Document {
  id: string
  title: string
  content: string
  team_id: string
  created_by: string
  created_at: string
  updated_at: string
  status: 'draft' | 'review' | 'published'
  category: string
  platform: string
  word_count: number
  collaborators: string[]
}

interface DocumentManagerProps {
  teamId: string
  userId: string
  onDocumentSelect: (document: Document) => void
  onCreateDocument: () => void
}

export default function DocumentManager({
  teamId,
  userId,
  onDocumentSelect,
  onCreateDocument
}: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title'>('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadDocuments()
  }, [teamId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('content_documents')
        .select('*')
        .eq('team_id', teamId)
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading documents:', error)
        return
      }

      setDocuments(data || [])
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const { error } = await supabase
        .from('content_documents')
        .delete()
        .eq('id', documentId)

      if (error) {
        console.error('Error deleting document:', error)
        return
      }

      // Reload documents
      loadDocuments()
    } catch (err) {
      console.error('Error deleting document:', err)
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
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin':
        return '💼'
      case 'twitter':
        return '🐦'
      case 'facebook':
        return '📘'
      case 'instagram':
        return '📷'
      case 'blog':
        return '📝'
      default:
        return '📄'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
          <Button onClick={onCreateDocument} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Document</span>
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="published">Published</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="updated_at">Last Modified</option>
            <option value="created_at">Created Date</option>
            <option value="title">Title</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center space-x-1"
          >
            <SortAsc className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
          </Button>
        </div>
      </div>

      {/* Documents list */}
      <div className="divide-y divide-gray-200">
        {documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
            <p className="text-gray-500 mb-4">Create your first document to get started</p>
            <Button onClick={onCreateDocument}>
              <Plus className="w-4 h-4 mr-2" />
              Create Document
            </Button>
          </div>
        ) : (
          documents.map((document) => (
            <div 
              key={document.id} 
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => {
                console.log('Document row clicked:', document)
                onDocumentSelect(document)
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">{getPlatformIcon(document.platform)}</span>
                    <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                      {document.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Updated {new Date(document.updated_at).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{document.collaborators?.length || 0} collaborators</span>
                    </span>
                    <span>{document.word_count || 0} words</span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">
                    {document.content?.replace(/<[^>]*>/g, '').substring(0, 150)}...
                  </p>
                </div>

                <div 
                  className="flex items-center space-x-2 ml-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      console.log('Edit button clicked for document:', document)
                      onDocumentSelect(document)
                    }}
                    className="flex items-center space-x-1"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDocumentSelect({ ...document, readOnly: true })}
                    className="flex items-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDocument(document.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
