'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
// import Collaboration from '@tiptap/extension-collaboration'
// import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
// import * as Y from 'yjs'
// import { WebsocketProvider } from 'y-websocket'
// import { IndexeddbPersistence } from 'y-indexeddb'
import { Button } from '@/components/ui/Button'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Save,
  Users,
  Eye,
  EyeOff
} from 'lucide-react'

interface CollaborativeEditorProps {
  documentId: string
  teamId: string
  userId: string
  userName: string
  onSave?: (content: string) => void
  readOnly?: boolean
  currentDocument?: any
  platform?: string
}

export default function CollaborativeEditor({
  documentId,
  teamId,
  userId,
  userName,
  onSave,
  readOnly = false,
  currentDocument,
  platform = 'blog'
}: CollaborativeEditorProps) {
  const [saving, setSaving] = useState(false)
  const [connected, setConnected] = useState(true) // Always connected for local development
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map())
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: true, // Enable built-in history for now
      }),
      Placeholder.configure({
        placeholder: 'Start writing your content...',
        placeholderClass: 'text-gray-500',
      }),
    ],
    content: currentDocument?.content || '',
    editable: !readOnly,
    immediatelyRender: false, // Fix SSR hydration issues
    onUpdate: ({ editor }) => {
      // Auto-save every 30 seconds
      if (onSave && !readOnly) {
        const content = editor.getHTML()
        onSave(content)
      }
    },
  })

  // Update editor content when document changes
  useEffect(() => {
    if (editor && currentDocument?.content) {
      editor.commands.setContent(currentDocument.content)
    }
  }, [editor, currentDocument?.content])

  const handleSave = async () => {
    if (!editor || readOnly) return
    
    setSaving(true)
    try {
      const content = editor.getHTML()
      if (onSave) {
        await onSave(content)
      }
    } catch (error) {
      console.error('Error saving document:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isClient || !editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <style jsx global>{`
        .ProseMirror {
          color: #111827 !important;
          line-height: 1.6 !important;
        }
        .ProseMirror p {
          margin: 0.5rem 0 !important;
          color: #111827 !important;
        }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
          margin: 1rem 0 0.5rem 0 !important;
          color: #111827 !important;
          font-weight: bold !important;
        }
        .ProseMirror ul, .ProseMirror ol {
          margin: 0.5rem 0 !important;
          padding-left: 1.5rem !important;
          color: #111827 !important;
        }
        .ProseMirror li {
          margin: 0.25rem 0 !important;
          color: #111827 !important;
        }
        .ProseMirror blockquote {
          margin: 1rem 0 !important;
          padding-left: 1rem !important;
          border-left: 3px solid #e5e7eb !important;
          color: #111827 !important;
        }
        .ProseMirror code {
          background-color: #f3f4f6 !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
          color: #111827 !important;
        }
        .ProseMirror strong {
          font-weight: bold !important;
          color: #111827 !important;
        }
        .ProseMirror em {
          font-style: italic !important;
          color: #111827 !important;
        }
        
        /* LinkedIn-specific styling */
        .linkedin-preview {
          background: #ffffff !important;
          border: 1px solid #e1e5e9 !important;
          border-radius: 8px !important;
          padding: 16px !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          color: #000000 !important;
        }
        
        .linkedin-preview .ProseMirror {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          color: #000000 !important;
        }
        
        .linkedin-preview .ProseMirror p {
          margin: 0 0 8px 0 !important;
          color: #000000 !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
        }
        
        .linkedin-preview .ProseMirror p:last-child {
          margin-bottom: 0 !important;
        }
        
        .linkedin-preview .ProseMirror strong {
          font-weight: 600 !important;
          color: #000000 !important;
        }
        
        .linkedin-preview .ProseMirror em {
          font-style: italic !important;
          color: #000000 !important;
        }
        
        .linkedin-preview .ProseMirror ul, .linkedin-preview .ProseMirror ol {
          margin: 8px 0 !important;
          padding-left: 20px !important;
          color: #000000 !important;
        }
        
        .linkedin-preview .ProseMirror li {
          margin: 2px 0 !important;
          color: #000000 !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
        }
      `}</style>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          {/* Formatting buttons */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('bold') ? 'bg-gray-100' : ''}`}
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('italic') ? 'bg-gray-100' : ''}`}
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('strike') ? 'bg-gray-100' : ''}`}
            >
              <Strikethrough className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('code') ? 'bg-gray-100' : ''}`}
            >
              <Code className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Headings */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-100' : ''}`}
            >
              <Heading1 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-100' : ''}`}
            >
              <Heading2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-100' : ''}`}
            >
              <Heading3 className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Lists */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('bulletList') ? 'bg-gray-100' : ''}`}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('orderedList') ? 'bg-gray-100' : ''}`}
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`text-gray-900 hover:text-gray-900 ${editor.isActive('blockquote') ? 'bg-gray-100' : ''}`}
            >
              <Quote className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* History */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="text-gray-900 hover:text-gray-900 disabled:text-gray-400"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="text-gray-900 hover:text-gray-900 disabled:text-gray-400"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right side - Save button and collaborators */}
        <div className="flex items-center space-x-4">
          {/* Collaborators - Simplified for now */}
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">
              Local editing mode
            </span>
          </div>

          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Save button */}
          {!readOnly && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 text-gray-900 hover:text-gray-900"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Editor content */}
      <div className="p-6">
        {platform === 'linkedin' ? (
          /* LinkedIn Post Preview */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* LinkedIn Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {userName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{userName || 'Your Name'}</div>
                    <div className="text-sm text-gray-500">Your Title • Your Company</div>
                    <div className="text-xs text-gray-400">now</div>
                  </div>
                </div>
              </div>
              
              {/* LinkedIn Post Content */}
              <div className="p-4">
                <div className="linkedin-preview">
                  <EditorContent 
                    editor={editor} 
                    className="min-h-[200px] focus:outline-none"
                    style={{ 
                      color: '#000000',
                      lineHeight: '1.4'
                    }}
                  />
                </div>
              </div>
              
              {/* LinkedIn Footer */}
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-gray-500">
                  <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-1 hover:text-blue-600">
                      <span>👍</span>
                      <span className="text-sm">Like</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-blue-600">
                      <span>💬</span>
                      <span className="text-sm">Comment</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-blue-600">
                      <span>🔄</span>
                      <span className="text-sm">Repost</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-blue-600">
                      <span>📤</span>
                      <span className="text-sm">Send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Preview indicator */}
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                <span>📱</span>
                <span>LinkedIn Post Preview</span>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Editor */
          <div className="min-h-[400px] border border-gray-200 rounded-md p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <EditorContent 
              editor={editor} 
              className="min-h-[350px] focus:outline-none"
              style={{ 
                color: '#111827',
                lineHeight: '1.6'
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
