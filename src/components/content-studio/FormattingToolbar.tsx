'use client'

import { useState, useEffect, useRef } from 'react'
import { Bold, Italic, Underline, List, Heading2, Heading3, Quote, Code } from 'lucide-react'

interface FormattingToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>
  onFormat: (format: string) => void
}

export default function FormattingToolbar({ editorRef, onFormat }: FormattingToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || !editorRef.current) {
        setIsVisible(false)
        return
      }

      const range = selection.getRangeAt(0)
      if (!range.toString().trim() || !editorRef.current.contains(range.commonAncestorContainer)) {
        setIsVisible(false)
        return
      }

      // Get bounding rect
      const rect = range.getBoundingClientRect()
      const toolbarHeight = toolbarRef.current?.offsetHeight || 40
      
      setPosition({
        top: rect.top - toolbarHeight - 8,
        left: rect.left + (rect.width / 2) - 150 // Center toolbar above selection
      })
      setIsVisible(true)
    }

    document.addEventListener('selectionchange', handleSelection)
    document.addEventListener('mouseup', handleSelection)

    return () => {
      document.removeEventListener('selectionchange', handleSelection)
      document.removeEventListener('mouseup', handleSelection)
    }
  }, [editorRef])

  const applyFormat = (command: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    if (!selectedText) return

    let formattedText = ''
    
    switch (command) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'code':
        formattedText = `\`${selectedText}\``
        break
      case 'quote':
        formattedText = `> ${selectedText}`
        break
      case 'h2':
        formattedText = `## ${selectedText}`
        break
      case 'h3':
        formattedText = `### ${selectedText}`
        break
      case 'list':
        formattedText = `- ${selectedText}`
        break
      default:
        formattedText = selectedText
    }

    // Replace selected text with formatted version
    range.deleteContents()
    const textNode = document.createTextNode(formattedText)
    range.insertNode(textNode)
    
    // Collapse selection to end
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)

    // Trigger input event to update markdown
    if (editorRef.current) {
      editorRef.current.dispatchEvent(new Event('input', { bubbles: true }))
    }

    setIsVisible(false)
    onFormat(command)
  }

  if (!isVisible) return null

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex items-center space-x-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        onClick={() => applyFormat('bold')}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Bold"
      >
        <Bold className="w-4 h-4 text-gray-700" />
      </button>
      <button
        onClick={() => applyFormat('italic')}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Italic"
      >
        <Italic className="w-4 h-4 text-gray-700" />
      </button>
      <button
        onClick={() => applyFormat('code')}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Code"
      >
        <Code className="w-4 h-4 text-gray-700" />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        onClick={() => applyFormat('h2')}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4 text-gray-700" />
      </button>
      <button
        onClick={() => applyFormat('h3')}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4 text-gray-700" />
      </button>
      <button
        onClick={() => applyFormat('list')}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="List"
      >
        <List className="w-4 h-4 text-gray-700" />
      </button>
      <button
        onClick={() => applyFormat('quote')}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Quote"
      >
        <Quote className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  )
}

