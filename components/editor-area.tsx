// components/editor-area.tsx
"use client"

import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from "react"
import { Resizable as CustomResizable } from "@/components/resizable" // Keep your custom Resizable
import FileExplorer from "@/components/file-explorer"
import CodeEditor, { type EditorTheme } from "@/components/code-editor"
import CodePreview from "@/components/code-preview"
import CodeDiffViewer from "@/components/code-diff-viewer"
import { Button, Input, ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui"; // Consolidated imports
import type { CodeFile, FileTreeItem } from "@/types/file"
import {
  Code2,
  GitCompareArrows,
  Eye,
  X,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Home,
  Maximize,
  Minimize,
  PanelLeftClose,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import path from 'path';

export interface EditorAreaRef {
  triggerFileTreeRefresh: () => void;
  handleFileSelectProgrammatic: (fileItem: FileTreeItem) => Promise<void>;
}

interface EditorAreaProps {
  activeFile: CodeFile | null
  setActiveFile: (file: CodeFile | null) => void
  onFileContentChange: (fileIdOrPath: string, newContent: string) => void
  toggleTerminal: () => void
  selectedEditorTheme?: EditorTheme
  rootDirectoryName: string;
  editorTypingTarget?: { path: string; content: string; onComplete?: () => void } | null;
  onEditorTypingComplete?: (path: string) => void;
}

const EditorArea = forwardRef<EditorAreaRef, EditorAreaProps>(({
  activeFile,
  setActiveFile,
  onFileContentChange,
  toggleTerminal,
  selectedEditorTheme,
  rootDirectoryName,
  editorTypingTarget,
  onEditorTypingComplete,
}, ref) => {
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [isLoadingFileTree, setIsLoadingFileTree] = useState(true);
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);

  const [activeTab, setActiveTab] = useState<"code" | "diff" | "preview">("code")
  const [previewContent, setPreviewContent] = useState<{ html: string; css: string; js: string; language: string; url: string }>({
    html: "", css: "", js: "", language: "plaintext", url: "about:blank",
  })
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);

  const fetchFileTree = useCallback(async () => {
    setIsLoadingFileTree(true);
    try {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error(`Failed to fetch file tree: ${response.statusText}`);
      }
      const data: FileTreeItem[] = await response.json();
      setFileTree(data);
    } catch (error) {
      console.error("Error fetching file tree:", error);
      toast.error("Could not load project files.");
      setFileTree([]);
    } finally {
      setIsLoadingFileTree(false);
    }
  }, []);

  const handleFileSelectProgrammatic = useCallback(async (fileItem: FileTreeItem) => {
    if (fileItem.isDirectory) return;
    setIsLoadingFileContent(true);
    setActiveTab("code"); 
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(fileItem.path)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch file content: ${response.statusText}`);
      }
      const fileData: CodeFile = await response.json();
      setActiveFile({ ...fileData, id: fileData.id || fileData.path });
    } catch (error) {
      console.error(`Error fetching content for ${fileItem.path}:`, error);
      toast.error(`Could not load file: ${fileItem.name}`);
      setActiveFile(null);
    } finally {
      setIsLoadingFileContent(false);
    }
  }, [setActiveFile]);

  useImperativeHandle(ref, () => ({
    triggerFileTreeRefresh: fetchFileTree,
    handleFileSelectProgrammatic,
  }));

  useEffect(() => {
    fetchFileTree();
  }, [fetchFileTree]);

  const handleFileSelect = useCallback(async (fileItem: FileTreeItem) => {
    if (fileItem.isDirectory) {
      return;
    }
    setIsLoadingFileContent(true);
    setActiveTab("code");
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(fileItem.path)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch file content: ${response.statusText}`);
      }
      const fileData: CodeFile = await response.json();
      setActiveFile({
        ...fileData,
        id: fileData.id || fileData.path,
      });
    } catch (error) {
      console.error(`Error fetching content for ${fileItem.path}:`, error);
      toast.error(`Could not load file: ${fileItem.name}`);
      setActiveFile(null);
    } finally {
      setIsLoadingFileContent(false);
    }
  }, [setActiveFile]);


  const handleRunCodeForPreview = useCallback(async (code: string, language: string, filePath?: string) => {
    let newHtml = "";
    let newCss = "";
    let newJs = "";
    let newUrl = `/${filePath ? path.basename(filePath) : 'preview.html'}`;
    let effectiveLanguage = language;

    const fetchLinkedFileContent = async (fileName: string, targetLanguage: 'css' | 'javascript') => {
        const fullPath = filePath ? path.join(path.dirname(filePath), fileName) : fileName;
        try {
            const res = await fetch(`/api/files?path=${encodeURIComponent(fullPath)}`);
            if (res.ok) {
                const file: CodeFile = await res.json();
                if (file.language === targetLanguage) return file.content;
            }
        } catch (e) { console.error("Error fetching linked file:", e); }
        return "";
    };

    if (language.toLowerCase() === "html") {
      newHtml = code;
      const cssMatch = code.match(/<link\s+.*?href=["'](.*?\.(?:css))["'].*?>/i);
      const jsMatch = code.match(/<script\s+.*?src=["'](.*?\.(?:js))["'].*?>/i);
      if (cssMatch?.[1]) newCss = await fetchLinkedFileContent(cssMatch[1], 'css');
      if (jsMatch?.[1]) newJs = await fetchLinkedFileContent(jsMatch[1], 'javascript');

    } else if (language.toLowerCase() === "javascript") {
      newHtml = `<h1>JavaScript Output</h1><div id="output"></div><style>body{margin:1rem; font-family:sans-serif;}</style>`;
      newJs = code;
      newUrl = `/${filePath ? path.basename(filePath) : 'preview.js'}`;
    } else if (language.toLowerCase() === "css") {
      newHtml = `<h1>CSS Styles Applied</h1><p class="styled-text">This text should be styled by your CSS.</p><style>body{margin:1rem; font-family:sans-serif;}</style>`;
      newCss = code;
      newUrl = `/${filePath ? path.basename(filePath) : 'preview.css'}`;
    } else {
      const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      newHtml = `<body style="background-color: var(--background); color: var(--foreground); margin:0; padding: 1rem; font-family: var(--font-mono); white-space: pre-wrap; height: 100vh; box-sizing: border-box;">${escapedCode}</body>`;
      newJs = "";
      newCss = "";
      newUrl = "about:text";
      effectiveLanguage = "plaintext";
    }

    setPreviewContent({ html: newHtml, css: newCss, js: newJs, language: effectiveLanguage, url: newUrl });
    setActiveTab("preview");
  }, []);

  const handleCloseActiveFile = () => {
    setActiveFile(null);
    if (activeTab === 'diff') setActiveTab('code');
  }

  const isPreviewable = previewContent.language === 'html' || previewContent.language === 'javascript' || previewContent.language === 'css';
  const canShowPreviewContent = isPreviewable && (previewContent.html || previewContent.css || previewContent.js);
  const canShowActiveFilePreview = activeFile && (activeFile.language === 'html' || activeFile.language === 'javascript' || activeFile.language === 'css');

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="h-10 border-b border-border flex items-center justify-between px-2 bg-muted">
        <div className="flex items-center h-full">
          <Button variant="ghost" size="sm" className={cn("h-full px-3 rounded-none text-xs font-medium flex items-center gap-1.5", activeTab === "code" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground")} onClick={() => setActiveTab("code")}> <Code2 size={14} /> Code </Button>
          <Button variant="ghost" size="sm" className={cn("h-full px-3 rounded-none text-xs font-medium flex items-center gap-1.5", activeTab === "diff" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground")} onClick={() => setActiveTab("diff")} disabled={!activeFile}> <GitCompareArrows size={14} /> Diff </Button>
          <Button variant="ghost" size="sm" className={cn("h-full px-3 rounded-none text-xs font-medium flex items-center gap-1.5", activeTab === "preview" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground")} onClick={() => setActiveTab("preview")}> <Eye size={14} /> Preview </Button>
        </div>
        <div className="flex items-center h-full space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={fetchFileTree}
            title="Refresh File Explorer"> <RefreshCw size={16} className="mr-1.5" /> Refresh Files </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={toggleTerminal}> <PanelLeftClose size={16} className="mr-1.5" /> Toggle Terminal </Button>
          {activeTab === 'diff' && ( <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Close Diff View" onClick={() => setActiveTab('code')}> <X size={18} /> </Button> )}
          {activeTab === 'preview' && isPreviewMaximized && ( <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsPreviewMaximized(false)} title="Exit Fullscreen Preview"> <X size={18}/> </Button> )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === "code" && (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40} className="border-r border-border bg-card">
              {isLoadingFileTree ? (
                <div className="p-4 flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading files...</span>
                </div>
              ) : (
                <FileExplorer
                  fileTree={fileTree}
                  activeFile={activeFile}
                  onFileSelect={handleFileSelect}
                  rootDirectoryName={rootDirectoryName}
                  onFileSystemUpdate={fetchFileTree}
                />
              )}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75}>
              <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {activeFile && (
                  <div className="h-9 border-b border-border flex items-center px-3 bg-muted">
                    <div className="flex-1 flex items-center">
                      <span className="text-sm flex items-center font-medium text-foreground">
                        {activeFile?.name}
                      </span>
                      {isLoadingFileContent && <Loader2 className="h-4 w-4 animate-spin ml-2 text-muted-foreground" />}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={handleCloseActiveFile}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="flex-1 overflow-auto">
                  <CodeEditor
                    file={activeFile}
                    onContentChange={onFileContentChange}
                    onRunCode={(code, lang) => handleRunCodeForPreview(code, lang, activeFile?.path)}
                    editorTheme={selectedEditorTheme}
                    typingTarget={editorTypingTarget}
                    onTypingComplete={onEditorTypingComplete}
                  />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {activeTab === "diff" && ( <div className="w-full h-full"> <CodeDiffViewer file={activeFile} onClose={() => setActiveTab("code")} /> </div> )}
        {activeTab === "preview" && (
          <div className={cn("w-full h-full flex flex-col bg-background", isPreviewMaximized && "fixed inset-0 z-[100] shadow-2xl")}>
            <div className="flex items-center p-1.5 border-b border-border bg-muted shrink-0 h-10">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"><ArrowLeft size={16}/></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"><ArrowRight size={16}/></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"><RefreshCw size={16}/></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground ml-1"><Home size={16}/></Button>
              <div className="flex-1 mx-2"> <Input readOnly value={previewContent.url} className="h-7 bg-input border-border text-foreground text-xs focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground" placeholder="about:blank" /> </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsPreviewMaximized(!isPreviewMaximized)} title={isPreviewMaximized ? "Minimize Preview" : "Maximize Preview"}> {isPreviewMaximized ? <Minimize size={16}/> : <Maximize size={16}/>} </Button>
            </div>
            <div className="flex-1 overflow-auto">
              {canShowPreviewContent || canShowActiveFilePreview ? ( <CodePreview htmlContent={previewContent.html} cssContent={previewContent.css} jsContent={previewContent.js} language={previewContent.language} /> ) : ( <div className="flex flex-col items-center justify-center text-muted-foreground h-full p-4 text-center"> <Eye size={48} className="mb-4 opacity-30" /> <p className="text-base font-medium">No preview available</p> {!activeFile && <p className="text-xs mt-1">Run an HTML, CSS, or JS file to see its preview here.</p>} {activeFile && !isPreviewable && <p className="text-xs mt-1">Preview is not supported for '{activeFile.language}' files.</p>} </div> )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
});
EditorArea.displayName = "EditorArea";
export default EditorArea;