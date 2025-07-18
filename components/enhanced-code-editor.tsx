"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { CodeFile } from "@/types/file"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Copy, 
  Check, 
  Play, 
  Save, 
  Download, 
  Eye, 
  Code2, 
  FileText,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings,
  Palette,
  Type,
  Zap,
  GitBranch,
  Clock,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCodeWithLineNumbers } from "@/lib/html-utils"
import { toast } from "sonner"
import hljs from 'highlight.js'

interface EnhancedCodeEditorProps {
  file: CodeFile
  theme?: string
  onFileUpdate?: (file: CodeFile) => void
}

export default function EnhancedCodeEditor({ file, theme = "dark", onFileUpdate }: EnhancedCodeEditorProps) {
  const editorRef = useRef<HTMLPreElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState(file.content)
  const [isEditing, setIsEditing] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<"code" | "preview" | "diff">("code")
  const [wordCount, setWordCount] = useState(0)
  const [lineCount, setLineCount] = useState(0)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [lastModified, setLastModified] = useState<Date>(new Date())

  const editorThemeClass = cn(
    "relative h-full overflow-hidden font-mono text-sm transition-all duration-200",
    theme === "dark"
      ? "bg-gray-900 text-gray-100"
      : theme === "light"
        ? "bg-white text-gray-900"
        : theme === "github-dark"
          ? "bg-[#0d1117] text-[#c9d1d9]"
          : theme === "github-light"
            ? "bg-[#ffffff] text-[#24292f]"
            : theme === "vscode-dark"
              ? "bg-[#1e1e1e] text-[#d4d4d4]"
              : theme === "monokai"
                ? "bg-[#272822] text-[#f8f8f2]"
                : "bg-gray-900 text-gray-100",
  )

  useEffect(() => {
    setContent(file.content)
    updateStats(file.content)
  }, [file])

  useEffect(() => {
    if (editorRef.current && !isEditing) {
      editorRef.current.className = `line-numbers language-${file.language}`
      let codeElement = editorRef.current.querySelector('code');

      if (!codeElement) {
        codeElement = document.createElement('code');
        editorRef.current.innerHTML = '';
        editorRef.current.appendChild(codeElement);
      }

      codeElement.innerHTML = formatCodeWithLineNumbers(content, file.language);
    }
  }, [content, file.language, isEditing])

  const updateStats = (text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length
    const lines = text.split('\n').length
    setWordCount(words)
    setLineCount(lines)
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    updateStats(newContent)
    setLastModified(new Date())
    
    if (onFileUpdate) {
      onFileUpdate({
        ...file,
        content: newContent
      })
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(content)
    setIsCopied(true)
    toast.success("Code copied to clipboard!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleRunCode = () => {
    console.log("Running code:", content)
    toast.success("Code execution simulated - check console for details")
  }

  const handleSaveCode = () => {
    console.log("Saving code:", content)
    toast.success("File saved successfully!")
    setLastModified(new Date())
  }

  const handleDownloadCode = () => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("File downloaded!")
  }

  const toggleEditMode = () => {
    setIsEditing((prev) => {
      if (!prev && textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 0)
      }
      return !prev;
    });
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleCursorPositionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    const text = textarea.value
    const cursorPos = textarea.selectionStart
    
    const textBeforeCursor = text.substring(0, cursorPos)
    const lines = textBeforeCursor.split('\n')
    const line = lines.length
    const column = lines[lines.length - 1].length + 1
    
    setCursorPosition({ line, column })
  }

  const getLanguageIcon = (language: string) => {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return '⚡'
      case 'html':
        return '🌐'
      case 'css':
        return '🎨'
      case 'json':
        return '📋'
      case 'markdown':
        return '📝'
      default:
        return '📄'
    }
  }

  return (
    <div className={cn("h-full flex flex-col", isFullscreen && "fixed inset-0 z-50 bg-background")}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getLanguageIcon(file.language)}</span>
            <div>
              <div className="text-sm font-medium truncate" title={file.name}>
                {file.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {file.language} • {lineCount} lines • {wordCount} words
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {file.language}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopyCode} title="Copy code">
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleRunCode} title="Run code">
            <Play className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveCode} title="Save code">
            <Save className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDownloadCode} title="Download code">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={toggleFullscreen} title="Toggle fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={toggleEditMode} className="ml-2">
            {isEditing ? "Preview" : "Edit"}
          </Button>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start h-10 bg-muted/20">
          <TabsTrigger value="code" className="flex items-center space-x-2">
            <Code2 className="h-4 w-4" />
            <span>Code</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </TabsTrigger>
          <TabsTrigger value="diff" className="flex items-center space-x-2">
            <GitBranch className="h-4 w-4" />
            <span>Changes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="flex-1 flex flex-col m-0">
          <div className={cn(editorThemeClass, "flex-1")}>
            {isEditing ? (
              <div className="h-full flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    handleContentChange(e.target.value)
                    handleCursorPositionChange(e)
                  }}
                  onSelect={handleCursorPositionChange}
                  className="flex-1 w-full bg-transparent border-none outline-none font-mono resize-none p-4 leading-relaxed text-current"
                  spellCheck="false"
                  style={{ 
                    tabSize: 2,
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                />
                {/* Status Bar for Edit Mode */}
                <div className="h-6 px-4 py-1 bg-muted/50 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                    <span>{content.length} characters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3" />
                    <span>Modified {lastModified.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <pre ref={editorRef} className={`line-numbers language-${file.language} p-4`}>
                  <code>{/* Content injected by useEffect */}</code>
                </pre>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0">
          <div className="h-full flex items-center justify-center bg-muted/10">
            <div className="text-center p-8">
              <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Live Preview</h3>
              <p className="text-sm text-muted-foreground">
                Preview functionality for {file.language} files coming soon
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="diff" className="flex-1 m-0">
          <div className="h-full flex items-center justify-center bg-muted/10">
            <div className="text-center p-8">
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Version Control</h3>
              <p className="text-sm text-muted-foreground">
                Git integration and diff view coming soon
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Status Bar */}
      {!isEditing && (
        <div className="h-6 px-4 py-1 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{file.language.toUpperCase()}</span>
            </span>
            <span>{lineCount} lines</span>
            <span>{wordCount} words</span>
            <span>{content.length} chars</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>Read-only</span>
            </span>
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Modified {lastModified.toLocaleTimeString()}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}