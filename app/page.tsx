// app/page.tsx
"use client"

import { useState } from "react"
// Make sure you are importing YOUR custom Resizable, not the one from ui if you intend to use this one.
import { Resizable } from "@/components/resizable" // Assuming this is your custom one
import Sidebar from "@/components/sidebar"
import EditorArea from "@/components/editor-area"
import Terminal from "@/components/terminal"
import type { CodeFile } from "@/types/file"

export default function Home() {
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [activeFile, setActiveFile] = useState<CodeFile | null>(null)
  // ... (rest of your state) ...
  const [files, setFiles] = useState<CodeFile[]>([
    {
      id: "1",
      name: "welcome.txt",
      path: "welcome.txt",
      content:
        "Welcome to the AI Coding Assistant!\n\nClick on a file in the explorer to edit it, or ask the AI assistant for help.",
      language: "plaintext",
    },
    {
      id: "2",
      name: "example.js",
      path: "src/example.js",
      content: "export function greet(name) {\n  return `Hello, ${name}!`;\n}\n",
      language: "javascript",
    },
    {
      id: "3",
      name: "app.js",
      path: "src/app.js",
      content: "import { greet } from './example.js';\n\nconsole.log(greet('World'));\n",
      language: "javascript",
    },
  ])


  const toggleTerminal = () => {
    setTerminalVisible(!terminalVisible)
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Resizable Panel */}
        <Resizable
          direction="horizontal"
          initialSize={350} // Initial size in pixels
          minSize={200}     // Min size in pixels
          maxSize={600}     // Max size in pixels
          resizerSide="right" // The resizer is on the right edge of this panel
          className="border-r border-border flex flex-col" // Added flex-col for Sidebar content
        >
          <Sidebar />
        </Resizable>

        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorArea
            files={files}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            toggleTerminal={toggleTerminal}
          />

          {terminalVisible && (
            <Resizable
              direction="vertical"
              initialSize={200} // Initial size in pixels
              minSize={100}
              maxSize="40vh" // Max size can still be relative, converted internally
              resizerSide="top" // The resizer is on the top edge of this panel
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
