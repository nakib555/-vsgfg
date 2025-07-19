"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Copy, 
  Download, 
  Save, 
  Maximize2, 
  FileText, 
  Code2,
  Settings,
  Edit3,
  Eye,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import hljs from 'highlight.js'
import type { CodeFile } from '@/types/file'

interface EnhancedCodeEditorProps {
  file: CodeFile | null
  theme?: string
  onFileUpdate?: (file: CodeFile) => void
}

export default function EnhancedCodeEditor({ file, theme = 'dark', onFileUpdate }: EnhancedCodeEditorProps) {
  const [content, setContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [isLoading, setIsLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (file) {
      setContent(file.content)
    }
  }, [file])

  // Syntax highlighting effect
  useEffect(() => {
    if (preRef.current && !isEditing && file) {
      const highlighted = hljs.highlight(content, {
        language: file.language || 'plaintext',
        ignoreIllegals: true
      }).value
      preRef.current.innerHTML = highlighted
    }
  }, [content, isEditing, file])
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    
    // Calculate cursor position
    const textarea = e.target
    const lines = newContent.substring(0, textarea.selectionStart).split('\n')
    setCursorPosition({
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    })
  }

  const handleSave = () => {
    if (file && onFileUpdate) {
      setIsLoading(true)
      const updatedFile = { ...file, content }
      onFileUpdate(updatedFile)
      setTimeout(() => {
        setIsLoading(false)
        toast.success('✅ File saved successfully')
        setIsEditing(false)
      }, 500)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    toast.success('📋 Code copied to clipboard')
  }

  const handleDownload = () => {
    if (!file) return
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('💾 File downloaded')
  }

  const handleRun = () => {
    if (file?.language === 'javascript' || file?.language === 'typescript') {
      try {
        // Simple code execution for demo purposes
        const result = eval(content)
        toast.success(`▶️ Code executed: ${result}`)
      } catch (error) {
        toast.error(`❌ Execution error: ${error}`)
      }
    } else {
      toast.info('ℹ️ Code execution not supported for this file type')
    }
  }

  const getLanguageIcon = (language?: string) => {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return <Code2 className="w-4 h-4 text-yellow-500" />
      case 'html':
        return <Code2 className="w-4 h-4 text-orange-500" />
      case 'css':
        return <Code2 className="w-4 h-4 text-blue-500" />
      case 'json':
        return <Code2 className="w-4 h-4 text-green-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getFileStats = () => {
    const lines = content.split('\n').length
    const words = content.split(/\s+/).filter(word => word.length > 0).length
    const characters = content.length
    
    return { lines, words, characters }
  }

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Code2 className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            No file selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            Select a file from the explorer to start editing, or create new files using the AI assistant
          </p>
        </div>
      </div>
    )
  }

  const stats = getFileStats()

  return (
    <div className={cn(
      "flex-1 flex flex-col",
      isFullscreen && "fixed inset-0 z-50 bg-background"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center space-x-3">
          {getLanguageIcon(file.language)}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {file.name}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {file.language || 'text'}
              </Badge>
              {isEditing && (
                <Badge variant="outline" className="text-xs">
                  <Edit3 className="w-3 h-3 mr-1" />
                  Editing
                </Badge>
              )}
              {isLoading && (
                <Badge variant="outline" className="text-xs">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Saving...
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground"
            title="Copy code"
          >
            <Copy className="w-4 h-4" />
          </Button>
          
          {(file.language === 'javascript' || file.language === 'typescript') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRun}
              className="text-green-600 hover:text-green-700 dark:text-green-400"
              title="Run code"
            >
              <Play className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          {isEditing && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              title="Save changes"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-muted-foreground hover:text-foreground"
            title={isEditing ? "View mode" : "Edit mode"}
          >
            {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-muted-foreground hover:text-foreground"
            title="Toggle fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            className="w-full h-full p-4 font-mono text-sm bg-background text-foreground border-none outline-none resize-none leading-relaxed"
            placeholder="Start typing..."
            spellCheck={false}
            style={{ tabSize: 2 }}
          />
        ) : (
          <div className="relative h-full overflow-auto">
            <pre 
              ref={preRef}
              className="w-full h-full p-4 font-mono text-sm bg-background text-foreground overflow-auto leading-relaxed"
            >
              <code className={cn("hljs", file.language && `language-${file.language}`)}>
                {content}
              </code>
            </pre>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>{stats.lines} lines</span>
          <span>{stats.words} words</span>
          <span>{stats.characters} characters</span>
          <span>•</span>
          <span className="font-medium">{file.language || 'plaintext'}</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {isEditing && (
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          )}
          <span className="text-xs">
            {isEditing ? 'Edit Mode' : 'View Mode'}
          </span>
        </div>
      </div>
    </div>
  )
}