'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CollaborativeEditor from '@/components/editor/CollaborativeEditor'
import DocumentManager from '@/components/editor/DocumentManager'
import { Button } from '@/components/ui/Button'
import { 
  ArrowLeft, 
  Save, 
  Share, 
  Settings, 
  Users, 
  Eye,
  Edit,
  FileText,
  Calendar,
  Target
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
  metadata?: any
  readOnly?: boolean
}

export default function EditorPage() {
  const [user, setUser] = useState<any>(null)
  const [teamId, setTeamId] = useState<string>('')
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null)
  const [showDocumentManager, setShowDocumentManager] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        // Get user's team
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .single()

        if (teamMember) {
          setTeamId(teamMember.team_id)
        }
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDocument = () => {
    const newDocument: Document = {
      id: `temp-${Date.now()}`,
      title: 'Untitled Document',
      content: '',
      team_id: teamId,
      created_by: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'draft',
      category: 'general',
      platform: 'blog',
      word_count: 0,
      collaborators: [user?.id || ''],
      metadata: {}
    }
    
    setCurrentDocument(newDocument)
    setShowDocumentManager(false)
  }

  const handleDocumentSelect = (document: Document) => {
    console.log('Document selected:', document)
    setCurrentDocument(document)
    setShowDocumentManager(false)
  }

  const handleSaveDocument = async (content: string) => {
    if (!currentDocument || !user) return

    setSaving(true)
    try {
      const documentData = {
        title: currentDocument.title,
        content: content,
        team_id: teamId,
        updated_at: new Date().toISOString(),
        word_count: content.replace(/<[^>]*>/g, '').split(/\s+/).length,
        status: currentDocument.status,
        platform: currentDocument.platform || 'blog',
        category: currentDocument.category || 'general',
        metadata: currentDocument.metadata || {}
      }

      console.log('Saving document with data:', documentData)
      console.log('Current document ID:', currentDocument.id)
      console.log('User ID:', user.id)
      console.log('Team ID:', teamId)

      if (currentDocument.id.startsWith('temp-')) {
        // Create new document
        console.log('Creating new document...')
        const { data, error } = await supabase
          .from('content_documents')
          .insert({
            ...documentData,
            created_by: user.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating document:', error)
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          return
        }

        console.log('Document created successfully:', data)
        setCurrentDocument({ ...currentDocument, id: data.id })
      } else {
        // Update existing document
        console.log('Updating existing document with ID:', currentDocument.id)
        const { data, error } = await supabase
          .from('content_documents')
          .update(documentData)
          .eq('id', currentDocument.id)
          .select()

        if (error) {
          console.error('Error updating document:', error)
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          return
        }

        console.log('Document updated successfully:', data)
      }
    } catch (err) {
      console.error('Error saving document:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleBackToDocuments = () => {
    setCurrentDocument(null)
    setShowDocumentManager(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user || !teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need to be part of a team to access the editor.</p>
          <Button onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
              
              {currentDocument && (
                <Button
                  variant="ghost"
                  onClick={handleBackToDocuments}
                  className="flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Documents</span>
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {currentDocument ? currentDocument.title : 'Content Editor'}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Users className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showDocumentManager ? (
          <DocumentManager
            teamId={teamId}
            userId={user.id}
            onDocumentSelect={handleDocumentSelect}
            onCreateDocument={handleCreateDocument}
          />
        ) : currentDocument ? (
          <div className="space-y-6">
            {/* Document info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Platform:</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {currentDocument.platform}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      currentDocument.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      currentDocument.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {currentDocument.status}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {saving && (
                    <span className="text-sm text-gray-500">Saving...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Editor */}
            <CollaborativeEditor
              documentId={currentDocument.id}
              teamId={teamId}
              userId={user.id}
              userName={user.user_metadata?.full_name || user.email || 'Anonymous'}
              onSave={handleSaveDocument}
              readOnly={currentDocument.readOnly}
              currentDocument={currentDocument}
              platform={currentDocument.platform}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
