// components/main-layout.tsx
"use client"

import React from "react"
import { Resizable } from "@/components/resizable"
import Sidebar from "@/components/sidebar"
import EditorArea from "@/components/editor-area"
import Terminal from "@/components/terminal"
import type { CodeFile, FileTreeItem } from "@/types/file"
import type { EditorTheme } from "@/components/code-editor"

interface MainLayoutProps {
  files: CodeFile[]
  activeFile: CodeFile | null
  setActiveFile: (file: CodeFile | null) => void
  terminalVisible: boolean
  toggleTerminal: () => void
  onRefreshFileTree: () => void;
  onAiOpenFileInEditor: (filePath: string) => Promise<void>;
  onAiExecuteTerminalCommand: (command: string) => Promise<{ success: boolean; output: string }>;
  selectedEditorTheme: EditorTheme | undefined;
  setSelectedEditorTheme: React.Dispatch<React.SetStateAction<EditorTheme | undefined>>;
  selectedTerminalTheme: string | undefined;
  setSelectedTerminalTheme: React.Dispatch<React.SetStateAction<string | undefined>>;
  isTerminalInputDisabled: boolean;
  setIsTerminalInputDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  fileTree: FileTreeItem[]; // For EditorArea's FileExplorer if it uses full tree
}

export default function MainLayout({
  files,
  activeFile,
  setActiveFile,
  terminalVisible,
  toggleTerminal,
  onRefreshFileTree,
  onAiOpenFileInEditor,
  onAiExecuteTerminalCommand,
  selectedEditorTheme,
  setSelectedEditorTheme,
  selectedTerminalTheme,
  setSelectedTerminalTheme,
  isTerminalInputDisabled,
  setIsTerminalInputDisabled,
  fileTree,
}: MainLayoutProps) {
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
          <Sidebar
            onRefreshFileTree={onRefreshFileTree}
            onAiOpenFileInEditor={onAiOpenFileInEditor}
            onAiExecuteTerminalCommand={onAiExecuteTerminalCommand}
            setSelectedEditorTheme={setSelectedEditorTheme}
            setSelectedTerminalTheme={setSelectedTerminalTheme}
            currentEditorTheme={selectedEditorTheme}
            currentTerminalTheme={selectedTerminalTheme}
            isTerminalInputDisabled={isTerminalInputDisabled}
            setIsTerminalInputDisabled={setIsTerminalInputDisabled}
          />
        </Resizable>

        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorArea
            files={files} // Pass the flat files list for EditorArea's internal FileExplorer
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            toggleTerminal={toggleTerminal}
            editorTheme={selectedEditorTheme}
            fileTree={fileTree} // Pass the full fileTree if EditorArea's explorer is updated
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
              <Terminal theme={selectedTerminalTheme} />
            </Resizable>
          )}
        </div>
      </div>
    </div>
  )
}
