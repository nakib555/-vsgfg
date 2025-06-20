"use client"

import { useState } from "react"
import { Resizable } from "@/components/resizable"
import FileExplorer from "@/components/file-explorer" // This will now be the main file explorer UI
import CodeEditor, { type EditorTheme } from "@/components/code-editor"
import CodeDiffViewer from "@/components/code-diff-viewer" // Import the diff viewer
import CodePreview from "@/components/code-preview" // Import the preview component
import { Button } from "@/components/ui"
import type { CodeFile, FileTreeItem } from "@/types/file"
import { Code2, GitCompareArrows, Eye, TerminalIcon, X, RefreshCcw, Info, FileWarning, FileSymlink } from "lucide-react" // Added GitCompareArrows, RefreshCcw, Info, FileWarning, FileSymlink
import { Skeleton } from "@/components/ui/skeleton" // FileTreeItem is already imported in types/file

interface EditorAreaProps {
  files: CodeFile[]
  activeFile: CodeFile | null
  setActiveFile: (file: CodeFile | null) => void
  toggleTerminal: () => void
  editorTheme?: EditorTheme // Added editorTheme prop
  fileTree: FileTreeItem[] // Added fileTree prop
  editorTheme?: EditorTheme // Added editorTheme prop
  fileTree: FileTreeItem[] // Added fileTree prop
  editorTheme?: EditorTheme // Added editorTheme prop
  fileTree: FileTreeItem[] // Added fileTree prop
  editorTheme?: EditorTheme // Added editorTheme prop
  fileTree: FileTreeItem[] // Added fileTree prop
}

export default function EditorArea({ files, activeFile, setActiveFile, toggleTerminal }: EditorAreaProps) {
  const [activeTab, setActiveTab] = useState<"code" | "diff" | "preview">("code")
  const [editorTheme, setEditorTheme] = useState("dark")

  return (
    <div className="flex flex-col h-full">
      {/* Editor Tabs */}
      <div className="h-10 border-b border-border flex items-center justify-between px-2">
        <div className="flex items-center h-full">
          <Button
            variant="ghost"
            size="sm"
            className={`h-full px-3 rounded-none ${activeTab === "code" ? "border-b-2 border-primary" : ""}`}
            onClick={() => setActiveTab("code")}
          >
            <Code2 className="h-4 w-4 mr-1" />
            Code
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-full px-3 rounded-none ${activeTab === "diff" ? "border-b-2 border-primary" : ""}`}
            onClick={() => setActiveTab("diff")}
          >
            <FileSymlink className="h-4 w-4 mr-1" />
            Diff
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-full px-3 rounded-none ${activeTab === "preview" ? "border-b-2 border-primary" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            <Eye className="h-4 w-4 mr-1" />
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
            <Resizable direction="horizontal" defaultSize={250} minSize={200} maxSize={400}>
              <div className="w-[250px] min-w-[200px] border-r border-border overflow-y-auto">
                <FileExplorer files={files} activeFile={activeFile} onFileSelect={setActiveFile} />
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
            Diff view would be implemented here
          </div>
        )}

        {activeTab === "preview" && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Preview would be implemented here
          </div>
        )}
      </div>
    </div>
  )
}
