'use client'

import { Bold, Italic, Heading1, Heading2, Heading3, List } from 'lucide-react'
import React from 'react'

export default function FormattingToolbar({ editorRef, onFormat }: { editorRef: React.RefObject<HTMLDivElement | null>, onFormat?: (format: string) => void }) {
  const apply = (cmd: string) => {
    onFormat?.(cmd)
    if (!editorRef.current) return
    editorRef.current.focus()
    switch (cmd) {
      case 'bold':
        document.execCommand('bold')
        break
      case 'italic':
        document.execCommand('italic')
        break
      case 'h1':
        document.execCommand('formatBlock', false, 'h1')
        break
      case 'h2':
        document.execCommand('formatBlock', false, 'h2')
        break
      case 'h3':
        document.execCommand('formatBlock', false, 'h3')
        break
      case 'ul':
        document.execCommand('insertUnorderedList')
        break
    }
  }

  const Button = ({ onClick, children, title }: { onClick: () => void, children: React.ReactNode, title: string }) => (
    <button
      type="button"
      title={title}
      className="px-2 py-1 hover:bg-gray-100 rounded"
      onClick={onClick}
    >
      {children}
    </button>
  )

  return (
    <div className="flex items-center space-x-1 p-2 border rounded-md bg-white mb-2 sticky top-0 z-10">
      <Button onClick={() => apply('bold')} title="Bold">
        <Bold className="w-4 h-4" />
      </Button>
      <Button onClick={() => apply('italic')} title="Italic">
        <Italic className="w-4 h-4" />
      </Button>
      <span className="mx-2 h-5 w-px bg-gray-200" />
      <Button onClick={() => apply('h1')} title="Heading 1">
        <Heading1 className="w-4 h-4" />
      </Button>
      <Button onClick={() => apply('h2')} title="Heading 2">
        <Heading2 className="w-4 h-4" />
      </Button>
      <Button onClick={() => apply('h3')} title="Heading 3">
        <Heading3 className="w-4 h-4" />
      </Button>
      <Button onClick={() => apply('ul')} title="Bullet List">
        <List className="w-4 h-4" />
      </Button>
    </div>
  )
}

 
