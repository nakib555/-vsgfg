"use client"

import { useState } from "react"
import { Resizable } from "@/components/resizable"
import FileExplorer from "@/components/file-explorer"
import CodeEditor from "@/components/code-editor"
import SearchPanel from "@/components/search-panel"
import PreviewPanel from "@/components/preview-panel"
import { Button } from "@/components/ui/button"
import type { CodeFile } from "@/types/file"
import { Code2, FileSymlink, Eye, TerminalIcon, X, FolderTree, Search, RefreshCw, ExternalLink, Copy, Maximize2 } from "lucide-react"

interface EditorAreaProps {
  files: CodeFile[]
  activeFile: CodeFile | null
  setActiveFile: (file: CodeFile | null) => void
  toggleTerminal: () => void
}

export default function EditorArea({ files, activeFile, setActiveFile, toggleTerminal }: EditorAreaProps) {
  const [activeTab, setActiveTab] = useState<"code" | "diff" | "preview">("code")
  const [activeSidebarTab, setActiveSidebarTab] = useState<"explorer" | "search">("explorer")
  const [editorTheme, setEditorTheme] = useState("dark")

  const handleRefresh = () => {
    // Refresh preview
    console.log("Refreshing preview...")
  }

  const handleOpenExternal = () => {
    // Open in new tab/window
    console.log("Opening in external window...")
  }

  const handleCopyUrl = () => {
    // Copy preview URL
    navigator.clipboard.writeText("http://localhost:3000")
    console.log("URL copied to clipboard")
  }

  const handleMaximize = () => {
    // Maximize preview
    console.log("Maximizing preview...")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main Editor Tabs */}
      <div className="h-10 border-b border-border flex items-center justify-between px-2 bg-background">
        <div className="flex items-center h-full">
          <Button
            variant="ghost"
            size="sm"
            className={`h-full px-4 rounded-none border-b-2 transition-colors ${
              activeTab === "code" 
                ? "border-blue-500 text-blue-500 bg-muted/30" 
                : "border-transparent hover:bg-muted/40"
            }`}
            onClick={() => setActiveTab("code")}
          >
            <Code2 className="h-4 w-4 mr-2" />
            Code
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-full px-4 rounded-none border-b-2 transition-colors ${
              activeTab === "diff" 
                ? "border-blue-500 text-blue-500 bg-muted/30" 
                : "border-transparent hover:bg-muted/40"
            }`}
            onClick={() => setActiveTab("diff")}
          >
            <FileSymlink className="h-4 w-4 mr-2" />
            Diff
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-full px-4 rounded-none border-b-2 transition-colors ${
              activeTab === "preview" 
                ? "border-blue-500 text-blue-500 bg-muted/30" 
                : "border-transparent hover:bg-muted/40"
            }`}
            onClick={() => setActiveTab("preview")}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>

        <div className="flex items-center h-full">
          <Button variant="ghost" size="sm" onClick={toggleTerminal}>
            <TerminalIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "code" && (
          <>
            <Resizable 
              direction="horizontal" 
              initialSize={300} 
              minSize={200} 
              maxSize={500}
              resizerSide="right"
              className="border-r border-border flex flex-col"
            >
              {/* Sidebar Tabs */}
              <div className="h-10 border-b border-border flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-full px-3 rounded-none flex-1 ${activeSidebarTab === "explorer" ? "bg-muted" : ""}`}
                  onClick={() => setActiveSidebarTab("explorer")}
                >
                  <FolderTree className="h-4 w-4 mr-1" />
                  Explorer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-full px-3 rounded-none flex-1 ${activeSidebarTab === "search" ? "bg-muted" : ""}`}
                  onClick={() => setActiveSidebarTab("search")}
                >
                  <Search className="h-4 w-4 mr-1" />
                  Search
                </Button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-hidden">
                {activeSidebarTab === "explorer" && (
                  <FileExplorer files={files} activeFile={activeFile} onFileSelect={setActiveFile} />
                )}
                {activeSidebarTab === "search" && (
                  <SearchPanel files={files} onFileSelect={setActiveFile} />
                )}
              </div>
            </Resizable>

            <div className="flex-1 flex flex-col">
              {activeFile && (
                <div className="h-9 border-b border-border flex items-center px-2">
                  <div className="flex-1 flex items-center">
                    <span className="px-3 py-1 text-sm flex items-center">
                      {activeFile.name}
                      <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => setActiveFile(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </span>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto">
                {activeFile ? (
                  <CodeEditor file={activeFile} theme={editorTheme} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Select a file to edit
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "diff" && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileSymlink className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Diff View</p>
              <p className="text-sm">Compare changes between file versions</p>
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="w-full h-full flex flex-col">
            {/* Preview Header */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-muted/20">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-2 px-3 py-1 bg-background border rounded-md">
                  <span className="text-sm text-muted-foreground">🔒</span>
                  <span className="text-sm font-mono">localhost:3000</span>
                  <span className="text-sm text-muted-foreground">/</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenExternal}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMaximize}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 bg-background">
              <PreviewPanel activeFile={activeFile} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}