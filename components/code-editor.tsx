"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { CodeFile } from "@/types/file"
import { Button } from "@/components/ui/button"
import { Copy, Check, Play, Save, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import hljs from 'highlight.js'

interface CodeEditorProps {
  file: CodeFile
  theme?: string
  onChange?: (content: string) => void
}

export default function CodeEditor({ file, theme = "dark", onChange }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState(file.content)
  const [isCopied, setIsCopied] = useState(false)

  const editorThemeClass = cn(
    "w-full h-full bg-transparent border-none outline-none font-mono resize-none p-4 text-sm leading-relaxed",
    theme === "dark"
      ? "bg-[#1e1e1e] text-[#d4d4d4]"
      : theme === "light"
        ? "bg-white text-gray-800"
        : "bg-[#1e1e1e] text-[#d4d4d4]"
  )

  useEffect(() => {
    setContent(file.content)
  }, [file])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    onChange?.(newContent)
  }, [onChange])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(content)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleRunCode = () => {
    console.log("Running code:", content)
    alert("Code execution is simulated. Check the console for details.")
  }

  const handleSaveCode = () => {
    console.log("Saving code:", content)
    alert("Code saved successfully (simulated)")
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
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + '  ' + content.substring(end)
      setContent(newContent)
      handleContentChange(newContent)
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Header with file info and actions */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#252526]">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-gray-300">
            <span>components</span>
            <span className="text-gray-500">›</span>
            <span className="text-blue-400">{file.name}</span>
          </div>
        </div>
        <div className="flex space-x-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white" onClick={handleCopyCode} title="Copy code">
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white" onClick={handleRunCode} title="Run code">
            <Play className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white" onClick={handleSaveCode} title="Save code">
            <Save className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white" onClick={handleDownloadCode} title="Download code">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Line numbers and editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line numbers */}
        <div className="bg-[#1e1e1e] text-gray-500 text-sm font-mono p-4 pr-2 select-none border-r border-gray-700 min-w-[60px]">
          {content.split('\n').map((_, index) => (
            <div key={index} className="leading-relaxed text-right">
              {index + 1}
            </div>
          ))}
        </div>

        {/* Code editor */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={editorThemeClass}
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            style={{
              tabSize: 2,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            }}
          />
        </div>
      </div>
    </div>
  )
}