// components/code-editor.tsx
"use client"

import React, { useEffect, useState, useRef } from "react"
import Editor, { Monaco, loader, type OnMount } from "@monaco-editor/react"
import type { editor as MonacoEditorTypes } from "monaco-editor"
import type { CodeFile } from "@/types/file"
import { Button } from "@/components/ui/button"
import { Copy, Check, Save, Download, Settings2, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { toast } from "sonner"

export type EditorTheme =
  | 'vs'
  | 'vs-dark'
  | 'hc-black'
  | 'hc-light';

export const editorThemesList: { name: string; value: EditorTheme }[] = [
  { name: "VS Dark (Default)", value: "vs-dark" },
  { name: "VS Light", value: "vs" },
  { name: "High Contrast Dark", value: "hc-black" },
  { name: "High Contrast Light", value: "hc-light" },
];

interface CodeEditorProps {
  file: CodeFile | null
  onContentChange?: (fileIdOrPath: string, newContent: string) => void // Changed to fileIdOrPath
  onRunCode?: (code: string, language: string) => void
  editorTheme?: EditorTheme;
  typingTarget?: { path: string; content: string; onComplete?: () => void } | null; // Updated to include onComplete
  onTypingComplete?: (path: string) => void;
}

const AI_EDITOR_TYPING_SPEED = 10; // ms per character

export default function CodeEditor({
  file,
  onContentChange,
  onRunCode,
  editorTheme,
  typingTarget,
  onTypingComplete,
}: CodeEditorProps) {
  const [isCopied, setIsCopied] = useState(false)
  const { theme: appTheme } = useTheme()

  const [currentEditorValue, setCurrentEditorValue] = useState(file?.content || "");
  const editorRef = useRef<MonacoEditorTypes.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const currentMonacoThemeToApply = editorTheme || (appTheme === "dark" || appTheme === "system" ? "vs-dark" : "vs");

  const handleEditorChange = (value: string | undefined) => {
    if (isAiTyping) return; 

    if (file && value !== undefined) {
      onContentChange?.(file.path, value); // Use file.path as identifier
      setCurrentEditorValue(value);
    }
  }

  const handleCopyCode = () => {
    if (currentEditorValue) {
      navigator.clipboard.writeText(currentEditorValue)
      setIsCopied(true)
      toast.success("Code copied to clipboard!")
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const handleRunCodeInternal = () => {
    if (currentEditorValue && file && onRunCode) {
      onRunCode(currentEditorValue, file.language)
      toast.info(`Running ${file.name}... Preview tab updated.`)
    } else if (file) {
      console.log("Running code (simulated):", currentEditorValue)
      toast.info("Code execution simulated. Check console.")
    }
  }

  const handleSaveCode = () => {
    if (file) {
      console.log("Saving code (simulated for file):", file.name, currentEditorValue)
      toast.success(`${file.name} saved (simulated)`)
      if (onContentChange) onContentChange(file.path, currentEditorValue); // Use file.path
    }
  }

  const handleDownloadCode = () => {
    if (file && currentEditorValue) {
      const blob = new Blob([currentEditorValue], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Downloading ${file.name}`)
    }
  }

  const handleEditorDidMount: OnMount = (instance, monacoInstance) => {
    editorRef.current = instance;
    monacoRef.current = monacoInstance;
    monacoInstance.editor.setTheme(currentMonacoThemeToApply);
  }

  useEffect(() => {
    loader.init().then((monaco) => {
      monacoRef.current = monaco;
      monaco.editor.setTheme(currentMonacoThemeToApply);
    }).catch(error => console.error("Monaco loader.init error in theme useEffect:", error));
  }, [currentMonacoThemeToApply]);


  useEffect(() => {
    if (typingTarget && editorRef.current && file && file.path === typingTarget.path) {
      setIsAiTyping(true);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      
      let charIndex = 0;
      const targetContent = typingTarget.content;
      editorRef.current.setValue(""); // Clear editor before typing
      setCurrentEditorValue(""); // Also clear local state

      typingIntervalRef.current = setInterval(() => {
        if (charIndex < targetContent.length) {
          const currentTypedValue = targetContent.substring(0, charIndex + 1);
          editorRef.current?.setValue(currentTypedValue); // Directly set value
          editorRef.current?.revealPosition({lineNumber: editorRef.current.getModel()?.getLineCount() || 1, column: 1}); // Scroll to end

          setCurrentEditorValue(currentTypedValue);
          if (onContentChange) onContentChange(file.path, currentTypedValue); // Use file.path

          charIndex++;
        } else {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
          setIsAiTyping(false);
          // Call the specific onComplete for this typing job first
          if (typingTarget.onComplete) typingTarget.onComplete();
          // Then call the general onTypingComplete if it exists (might be for other UI updates)
          if (onTypingComplete) onTypingComplete(typingTarget.path);
        }
      }, AI_EDITOR_TYPING_SPEED);

    } else if (!typingTarget && file) { // Normal file load or switch
        if (typingIntervalRef.current) { // Stop any ongoing AI typing if file changes
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
            setIsAiTyping(false);
            // If typing was interrupted, call onTypingComplete for the previous target
            if(onTypingComplete && editorRef.current?.getModel()?.uri.toString() !== file.path) {
                // This logic might be complex if typingTarget was for a different file.
                // For simplicity, we assume typingTarget is cleared before file switch.
            }
        }
        setCurrentEditorValue(file.content);
        if (editorRef.current) {
            // Only set value if the model is different or content differs
            const currentModel = editorRef.current.getModel();
            if (!currentModel || currentModel.uri.toString() !== file.path || editorRef.current.getValue() !== file.content) {
                 editorRef.current.setValue(file.content);
            }
        }
    } else if (!file && !typingTarget) { // No file and no typing target
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
            setIsAiTyping(false);
        }
        setCurrentEditorValue("");
        if (editorRef.current) editorRef.current.setValue("");
    }

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        setIsAiTyping(false);
      }
    };
  }, [file, typingTarget, onTypingComplete, onContentChange]);


  if (!file && !typingTarget) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-background p-4">
        <Settings2 className="h-16 w-16 mb-4 opacity-30" />
        <p>Select a file to start editing or create a new one.</p>
      </div>
    )
  }

  const displayLanguage = file?.language || (typingTarget ? (typingTarget.path.split('.').pop() || 'plaintext') : 'plaintext');


  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-end p-1.5 border-b border-border bg-muted shrink-0 space-x-1">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleRunCodeInternal} title="Run code / Update Preview" disabled={!file || isAiTyping}>
          <Play className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleCopyCode} title="Copy code" disabled={!currentEditorValue || isAiTyping}>
          {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleSaveCode} title="Save code" disabled={!file || isAiTyping}>
          <Save className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleDownloadCode} title="Download code" disabled={!file || !currentEditorValue || isAiTyping}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          key={`${file?.path || typingTarget?.path}-${currentMonacoThemeToApply}`} // Use path for key
          height="100%"
          path={file?.path || typingTarget?.path} // Provide path for model URI
          language={displayLanguage}
          value={currentEditorValue}
          theme={currentMonacoThemeToApply}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true, side: 'right' },
            fontSize: 13,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderLineHighlight: "gutter",
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 5,
            lineNumbersMinChars: 3,
            padding: { top: 8, bottom: 8 },
            readOnly: isAiTyping,
          }}
        />
      </div>
    </div>
  )
}