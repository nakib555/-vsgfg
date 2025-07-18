// app/page.tsx
"use client"

import { useState } from "react"
import { Resizable } from "@/components/resizable" // Assuming this is your custom one
import EnhancedAIChat from "@/components/ai-chat-enhanced"
import EditorArea from "@/components/editor-area"
import Terminal from "@/components/terminal"
import type { CodeFile } from "@/types/file"

export default function Home() {
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [activeFile, setActiveFile] = useState<CodeFile | null>(null)
  const [files, setFiles] = useState<CodeFile[]>([
    {
      id: "1",
      name: "welcome.txt",
      path: "welcome.txt",
      content:
        "Welcome to the Enhanced AI Coding Assistant!\n\nThis IDE now supports:\n- Live file creation and updates\n- Real-time typing effects\n- Enhanced code editing\n- File operation workflows\n\nClick on a file in the explorer to edit it, or use the AI assistant to create new files!",
      language: "plaintext",
    },
    {
      id: "2",
      name: "example.js",
      path: "src/example.js",
      content: "// Enhanced JavaScript example\nexport function greet(name) {\n  return `Hello, ${name}! Welcome to the enhanced IDE!`;\n}\n\nexport function createProject(name, type) {\n  console.log(`Creating ${type} project: ${name}`);\n  return {\n    name,\n    type,\n    created: new Date().toISOString()\n  };\n}",
      language: "javascript",
    },
    {
      id: "3",
      name: "app.js",
      path: "src/app.js",
      content: "import { greet, createProject } from './example.js';\n\nconsole.log(greet('Enhanced World'));\n\nconst project = createProject('My App', 'React');\nconsole.log('Project created:', project);",
      language: "javascript",
    },
  ])

  const handleFileCreate = (file: CodeFile) => {
    setFiles(prev => [...prev, file])
    setActiveFile(file)
  }

  const handleFileUpdate = (updatedFile: CodeFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f))
    if (activeFile?.id === updatedFile.id) {
      setActiveFile(updatedFile)
    }
  }

  const handleFileDelete = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    if (activeFile?.id === fileId) {
      setActiveFile(null)
    }
  }

  const toggleTerminal = () => {
    setTerminalVisible(!terminalVisible)
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        {/* Enhanced AI Chat Sidebar */}
        <Resizable
          direction="horizontal"
          initialSize={400}
          minSize={300}
          maxSize={700}
          resizerSide="right"
          className="border-r border-border flex flex-col"
        >
          <EnhancedAIChat 
            files={files}
            onFileCreate={handleFileCreate}
            onFileUpdate={handleFileUpdate}
            onFileDelete={handleFileDelete}
          />
        </Resizable>

        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorArea
            files={files}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            toggleTerminal={toggleTerminal}
            onFileUpdate={handleFileUpdate}
          />

          {terminalVisible && (
            <Resizable
              direction="vertical"
              initialSize={200}
              minSize={100}
              maxSize="40vh"
              resizerSide="top"
              className="border-t border-border overflow-hidden"
            >
              <Terminal />
            </Resizable>
          )}
        </div>
      </div>
    </div>
  )
}
