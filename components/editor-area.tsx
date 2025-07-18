"use client"

import { useState } from "react"
import { Resizable } from "@/components/resizable"
import FileExplorer from "@/components/file-explorer"
import EnhancedCodeEditor from "@/components/enhanced-code-editor"
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
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Maximize2,
  Menu,
  ChevronDown,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EditorAreaProps {
  files: CodeFile[]
  activeFile: CodeFile | null
  setActiveFile: (file: CodeFile | null) => void
  toggleTerminal: () => void
  onFileUpdate?: (file: CodeFile) => void
}

export default function EditorArea({ files, activeFile, setActiveFile, toggleTerminal, onFileUpdate }: EditorAreaProps) {
  const [activeTab, setActiveTab] = useState<"code" | "diff" | "preview">("code")
  const [activeSidebarTab, setActiveSidebarTab] = useState<"explorer" | "search">("explorer")
  const [editorTheme, setEditorTheme] = useState("dark")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()

  const handleRefresh = () => {
    console.log("Refreshing preview...")
  }

  const handleOpenExternal = () => {
    console.log("Opening in external window...")
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText("http://localhost:3000")
    console.log("URL copied to clipboard")
  }

  const handleMaximize = () => {
    console.log("Maximizing preview...")
  }

  // Mobile sidebar content
  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Mobile Sidebar Tabs */}
      <div className="h-12 border-b border-border flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-full px-3 rounded-none flex-1 text-xs sm:text-sm",
            activeSidebarTab === "explorer" ? "bg-muted" : ""
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
            "h-full px-3 rounded-none flex-1 text-xs sm:text-sm",
            activeSidebarTab === "search" ? "bg-muted" : ""
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
    <div className="flex flex-col h-full">
      {/* Main Editor Tabs - Responsive */}
      <div className="h-10 sm:h-12 border-b border-border flex items-center justify-between px-2 bg-background">
        <div className="flex items-center h-full">
          {/* Mobile Menu Button */}
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-2">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
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
                "h-full px-2 sm:px-4 rounded-none border-b-2 transition-colors text-xs sm:text-sm",
                activeTab === "code" 
                  ? "border-blue-500 text-blue-500 bg-muted/30" 
                  : "border-transparent hover:bg-muted/40"
              )}
              onClick={() => setActiveTab("code")}
            >
              <Code2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Code</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-full px-2 sm:px-4 rounded-none border-b-2 transition-colors text-xs sm:text-sm",
                activeTab === "diff" 
                  ? "border-blue-500 text-blue-500 bg-muted/30" 
                  : "border-transparent hover:bg-muted/40"
              )}
              onClick={() => setActiveTab("diff")}
            >
              <FileSymlink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Diff</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-full px-2 sm:px-4 rounded-none border-b-2 transition-colors text-xs sm:text-sm",
                activeTab === "preview" 
                  ? "border-blue-500 text-blue-500 bg-muted/30" 
                  : "border-transparent hover:bg-muted/40"
              )}
              onClick={() => setActiveTab("preview")}
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Preview</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center h-full">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleTerminal}
            className="h-8 w-8 p-0"
          >
            <TerminalIcon className="h-3 w-3 sm:h-4 sm:w-4" />
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
                className="border-r border-border flex flex-col"
              >
                <SidebarContent />
              </Resizable>
            )}

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* File Tab Bar - Responsive */}
              {activeFile && (
                <div className="h-8 sm:h-9 border-b border-border flex items-center px-2 bg-muted/10">
                  <div className="flex-1 flex items-center min-w-0">
                    <div className="flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm bg-background rounded-t border-t border-l border-r min-w-0">
                      <span className="truncate mr-1 sm:mr-2">{activeFile.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" 
                        onClick={() => setActiveFile(null)}
                      >
                        <X className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {activeFile ? (
                  <EnhancedCodeEditor 
                    file={activeFile} 
                    theme={editorTheme} 
                    onFileUpdate={onFileUpdate}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground p-4">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm sm:text-base font-medium mb-2">Enhanced IDE Ready</p>
                      <p className="text-xs sm:text-sm">
                        {isMobile ? "Tap the menu to select a file or use AI to create new ones" : "Select a file from the explorer or use the AI assistant to create and manage files"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "diff" && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground p-4">
            <div className="text-center">
              <FileSymlink className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-lg font-medium mb-2">Enhanced Diff View</p>
              <p className="text-xs sm:text-sm">Advanced file comparison and version control coming soon</p>
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="w-full h-full flex flex-col">
            {/* Preview Header - Responsive */}
            <div className="h-10 sm:h-12 border-b border-border flex items-center justify-between px-2 sm:px-4 bg-muted/20">
              <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" 
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                
                {/* URL Bar - Responsive */}
                <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 bg-background border rounded-md min-w-0 flex-1 max-w-xs sm:max-w-md">
                  <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">🔒</span>
                  <span className="text-xs sm:text-sm font-mono truncate">localhost:3000</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">/</span>
                </div>
              </div>
              
              {/* Action Buttons - Responsive */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 sm:h-8 sm:w-8" 
                  onClick={handleCopyUrl}
                >
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 sm:h-8 sm:w-8" 
                  onClick={handleOpenExternal}
                >
                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 sm:h-8 sm:w-8" 
                  onClick={handleMaximize}
                >
                  <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
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