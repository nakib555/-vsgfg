"use client"

import { useState } from "react"
import { Resizable } from "@/components/resizable"
import FileExplorer from "@/components/file-explorer"
import CodeEditor from "@/components/code-editor"
import SearchPanel from "@/components/search-panel"
import PreviewPanel from "@/components/preview-panel"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import type { CodeFile } from "@/types/file"
import { 
  Code2, 
  FileSymlink, 
  Eye, 
  TerminalIcon, 
  X, 
  FolderTree, 
  Search, 
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EditorAreaProps {
  files: CodeFile[]
  activeFile: CodeFile | null
  setActiveFile: (file: CodeFile | null) => void
  toggleTerminal: () => void
}

export default function EditorArea({ files, activeFile, setActiveFile, toggleTerminal }: EditorAreaProps) {
  const [activeTab, setActiveTab] = useState<"code" | "diff" | "preview">("code")
  const [activeSidebarTab, setActiveSidebarTab] = useState<"explorer" | "search">("explorer")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const isMobile = useIsMobile()

  const handleFileContentChange = (fileId: string, content: string) => {
    setFileContents(prev => ({
      ...prev,
      [fileId]: content
    }))
  }

  const getCurrentFileContent = (file: CodeFile) => {
    return fileContents[file.id] || file.content
  }

  // Mobile sidebar content
  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-[#252526]">
      {/* Mobile Sidebar Tabs */}
      <div className="h-12 border-b border-gray-700 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-full px-3 rounded-none flex-1 text-xs sm:text-sm text-gray-300",
            activeSidebarTab === "explorer" ? "bg-[#1e1e1e] text-white" : "hover:bg-gray-700"
          )}
          onClick={() => setActiveSidebarTab("explorer")}
        >
          <FolderTree className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Explorer</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-full px-3 rounded-none flex-1 text-xs sm:text-sm text-gray-300",
            activeSidebarTab === "search" ? "bg-[#1e1e1e] text-white" : "hover:bg-gray-700"
          )}
          onClick={() => setActiveSidebarTab("search")}
        >
          <Search className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden">
        {activeSidebarTab === "explorer" && (
          <FileExplorer 
            files={files} 
            activeFile={activeFile} 
            onFileSelect={(file) => {
              setActiveFile(file)
              if (isMobile) setSidebarOpen(false)
            }} 
          />
        )}
        {activeSidebarTab === "search" && (
          <SearchPanel 
            files={files} 
            onFileSelect={(file) => {
              setActiveFile(file)
              if (isMobile) setSidebarOpen(false)
            }} 
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Main Editor Tabs - Responsive */}
      <div className="h-12 border-b border-gray-700 flex items-center justify-between px-4 bg-[#252526]">
        <div className="flex items-center h-full">
          {/* Mobile Menu Button */}
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-2 text-gray-400 hover:text-white">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 bg-[#252526]">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          )}

          {/* Tab Buttons - Responsive */}
          <div className="flex items-center h-full">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-full px-4 rounded-none border-b-2 transition-colors text-sm text-gray-300",
                activeTab === "code" 
                  ? "border-blue-500 text-blue-400 bg-[#1e1e1e]" 
                  : "border-transparent hover:bg-gray-700 hover:text-white"
              )}
              onClick={() => setActiveTab("code")}
            >
              <Code2 className="h-4 w-4 mr-2" />
              Code
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-full px-4 rounded-none border-b-2 transition-colors text-sm text-gray-300",
                activeTab === "diff" 
                  ? "border-blue-500 text-blue-400 bg-[#1e1e1e]" 
                  : "border-transparent hover:bg-gray-700 hover:text-white"
              )}
              onClick={() => setActiveTab("diff")}
            >
              <FileSymlink className="h-4 w-4 mr-2" />
              Diff
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-full px-4 rounded-none border-b-2 transition-colors text-sm text-gray-300",
                activeTab === "preview" 
                  ? "border-blue-500 text-blue-400 bg-[#1e1e1e]" 
                  : "border-transparent hover:bg-gray-700 hover:text-white"
              )}
              onClick={() => setActiveTab("preview")}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>

        <div className="flex items-center h-full">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleTerminal}
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
          >
            <TerminalIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content - Responsive Layout */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "code" && (
          <>
            {/* Desktop Sidebar */}
            {!isMobile && (
              <Resizable 
                direction="horizontal" 
                initialSize={280} 
                minSize={200} 
                maxSize={500}
                resizerSide="right"
                className="border-r border-gray-700 flex flex-col bg-[#252526]"
              >
                <SidebarContent />
              </Resizable>
            )}

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* File Tab Bar - Responsive */}
              {activeFile && (
                <div className="h-9 border-b border-gray-700 flex items-center px-3 bg-[#2d2d30]">
                  <div className="flex-1 flex items-center min-w-0">
                    <div className="flex items-center px-3 py-1 text-sm bg-[#1e1e1e] rounded-t border-t border-l border-r border-gray-600 min-w-0 text-gray-300">
                      <span className="truncate mr-2">{activeFile.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 flex-shrink-0 text-gray-400 hover:text-white" 
                        onClick={() => setActiveFile(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {activeFile ? (
                  <CodeEditor 
                    file={{
                      ...activeFile,
                      content: getCurrentFileContent(activeFile)
                    }} 
                    theme="dark"
                    onChange={(content) => handleFileContentChange(activeFile.id, content)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 p-4 bg-[#1e1e1e]">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📄</span>
                      </div>
                      <h3 className="text-lg font-medium mb-2 text-gray-300">No File Selected</h3>
                      <p className="text-sm text-gray-500">
                        {isMobile ? "Tap the menu to select a file" : "Select a file from the explorer to edit"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "diff" && (
          <div className="w-full h-full flex items-center justify-center text-gray-400 p-4 bg-[#1e1e1e]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
                <FileSymlink className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-300">Diff View</h3>
              <p className="text-sm text-gray-500">Compare changes between file versions</p>
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <PreviewPanel 
            activeFile={activeFile ? {
              ...activeFile,
              content: getCurrentFileContent(activeFile)
            } : null} 
          />
        )}
      </div>
    </div>
  )
}