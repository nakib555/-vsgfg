
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { CodeFile } from "@/types/file"
import { Button } from "@/components/ui/button"
import { Copy, Check, Play, Save, Download } from "lucide-react"
import { cn } from "@/lib/utils" // Ensure this is imported
import { formatCodeWithLineNumbers } from "@/lib/html-utils" // Import the utility

interface CodeEditorProps {
  file: CodeFile
  theme?: string
}

export default function CodeEditor({ file, theme = "dark" }: CodeEditorProps) {
  const editorRef = useRef<HTMLPreElement>(null)
  const [content, setContent] = useState(file.content)
  const [isEditing, setIsEditing] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const editorThemeClass = cn(
    "p-4 h-full overflow-auto font-mono text-sm",
    theme === "dark"
      ? "bg-background text-foreground"
      : theme === "light"
        ? "bg-background text-foreground"
        : theme === "github-dark"
          ? "bg-[#0d1117] text-[#c9d1d9]"
          : theme === "github-light"
            ? "bg-[#ffffff] text-[#24292f]"
            : theme === "vscode-dark"
              ? "bg-[#1e1e1e] text-[#d4d4d4]"
              : theme === "monokai"
                ? "bg-[#272822] text-[#f8f8f2]"
                : "bg-background text-foreground", // Default
  )

  useEffect(() => {
    setContent(file.content)
  }, [file])

  useEffect(() => {
    if (editorRef.current && !isEditing) {
      editorRef.current.className = `line-numbers language-${file.language}`
      let codeElement = editorRef.current.querySelector('code');

      if (!codeElement) { // If no code element, create one
        codeElement = document.createElement('code');
        editorRef.current.innerHTML = ''; // Clear pre
        editorRef.current.appendChild(codeElement);
      }

      // Use the utility function to format and highlight
      codeElement.innerHTML = formatCodeWithLineNumbers(content, file.language);
    }
  }, [content, file.language, isEditing])

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

  const toggleEditMode = () => {
    setIsEditing((prev) => {
      if (!prev && textareaRef.current) { // Entering edit mode
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 0)
      }
      return !prev;
    });
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
        <div className="text-sm font-medium truncate" title={file.name}>{file.name}</div>
        <div className="flex space-x-1 shrink-0">
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
          <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={toggleEditMode} className="ml-2">
            {isEditing ? "View" : "Edit"}
          </Button>
        </div>
      </div>
      <div className={cn(editorThemeClass, "flex-1")}> {/* Added flex-1 to make it take remaining space */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content} // Use content state
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full bg-transparent border-none outline-none font-mono resize-none p-0 m-0 leading-relaxed text-current" // Ensure no extra padding/margin and inherits text color
            spellCheck="false"
          />
        ) : (
          <pre ref={editorRef} className={`line-numbers language-${file.language}`}>
            <code>{/* Content injected by useEffect */}</code>
          </pre>
        )}
      </div>
    </div>
  )
}