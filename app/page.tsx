// app/page.tsx
"use client"

import { useState, useCallback, useRef } from "react"
import { Resizable as CustomResizable } from "@/components/resizable" // Your custom Resizable
import Sidebar from "@/components/sidebar"
import EditorArea, { type EditorAreaRef } from "@/components/editor-area"
import Terminal, { type TerminalRef } from "@/components/terminal"
import type { CodeFile } from "@/types/file"
import { type EditorTheme } from "@/components/code-editor";

export default function Home() {
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [activeFile, setActiveFile] = useState<CodeFile | null>(null)
  const [editorTypingTarget, setEditorTypingTarget] = useState<{ path: string; content: string; onComplete: () => void } | null>(null);
  const [isTerminalInputDisabled, setIsTerminalInputDisabled] = useState(false);


  const editorAreaRef = useRef<EditorAreaRef>(null);
  const terminalRef = useRef<TerminalRef>(null);

  const [selectedEditorTheme, setSelectedEditorTheme] = useState<EditorTheme | undefined>(undefined);
  const [selectedTerminalTheme, setSelectedTerminalTheme] = useState<string | undefined>(undefined);


  const handleFileContentChange = useCallback((fileIdOrPath: string, newContent: string) => {
    setActiveFile(prev => {
      if (prev && (prev.id === fileIdOrPath || prev.path === fileIdOrPath)) {
        return { ...prev, content: newContent };
      }
      return prev;
    });
  }, []);


  const toggleTerminal = () => {
    setTerminalVisible(!terminalVisible)
  }

  const terminalWorkingDirectory = "my_project";

  const triggerEditorAreaRefresh = useCallback(() => {
    editorAreaRef.current?.triggerFileTreeRefresh();
  }, []);


  const handleAiOpenFileInEditor = useCallback(async (filePath: string) => {
    if (editorAreaRef.current) {
      const fileItem = { name: filePath.split('/').pop() || filePath, path: filePath, isDirectory: false, id: filePath };
      await editorAreaRef.current.handleFileSelectProgrammatic(fileItem);
    }
    setEditorTypingTarget(null);
  }, []);

  const handleAiEditorTypingComplete = useCallback((filePath: string) => {
    if (editorTypingTarget && editorTypingTarget.path === filePath && editorTypingTarget.onComplete) {
      editorTypingTarget.onComplete();
    }
    setEditorTypingTarget(null);
  }, [editorTypingTarget]);

  const handleAiExecuteTerminalCommand = useCallback(async (command: string): Promise<{ success: boolean; output: string }> => {
    if (isTerminalInputDisabled) {
      console.warn("[Home Page] AI tried to execute terminal command while input is disabled by user setting.");
      return { success: false, output: "Terminal input is currently disabled by user setting." };
    }
    if (terminalRef.current) {
      if (!terminalVisible) setTerminalVisible(true); 
      return await terminalRef.current.executeExternalCommand(command);
    }
    return { success: false, output: "Terminal not available." };
  }, [terminalVisible, isTerminalInputDisabled]);


  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <CustomResizable // Use your custom Resizable
          direction="horizontal"
          initialSize={350} 
          minSize={250}
          maxSize={1000} 
          resizerSide="right"
          className="border-r border-border flex flex-col" 
        >
          <Sidebar
            onRefreshFileTree={triggerEditorAreaRefresh}
            onAiOpenFileInEditor={handleAiOpenFileInEditor}
            onAiExecuteTerminalCommand={handleAiExecuteTerminalCommand}
            setSelectedEditorTheme={setSelectedEditorTheme}
            setSelectedTerminalTheme={setSelectedTerminalTheme}
            currentEditorTheme={selectedEditorTheme}
            currentTerminalTheme={selectedTerminalTheme}
            isTerminalInputDisabled={isTerminalInputDisabled}
            setIsTerminalInputDisabled={setIsTerminalInputDisabled}
          />
        </CustomResizable>

        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorArea
            ref={editorAreaRef}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            onFileContentChange={handleFileContentChange}
            toggleTerminal={toggleTerminal}
            selectedEditorTheme={selectedEditorTheme}
            rootDirectoryName={terminalWorkingDirectory}
            editorTypingTarget={editorTypingTarget}
            onEditorTypingComplete={handleAiEditorTypingComplete}
          />

          {terminalVisible && (
            <CustomResizable // Use your custom Resizable
              direction="vertical"
              initialSize={200} 
              minSize={100}
              maxSize="40vh" 
              resizerSide="top"
              className="border-t border-border overflow-hidden" 
            >
              <Terminal
                ref={terminalRef}
                theme={selectedTerminalTheme}
                workingDirectory={terminalWorkingDirectory}
                isInputDisabledBySetting={isTerminalInputDisabled}
              />
            </CustomResizable>
          )}
        </div>
      </div>
    </div>
  )
}