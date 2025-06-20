// app/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import MainLayout from "@/components/main-layout" // Import MainLayout
import type { CodeFile, FileTreeItem } from "@/types/file"
import { PowerShellService, getPowerShellInstance, removePowerShellInstance } from "@/lib/powershell-service"
import { toast } from "sonner"
import type { EditorTheme } from "@/components/code-editor"
import { generateId } from "@/lib/utils"

const DEFAULT_EDITOR_THEME: EditorTheme = 'vs-dark';
const DEFAULT_TERMINAL_THEME: string = 'dark';

export default function Home() {
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [activeFile, setActiveFile] = useState<CodeFile | null>(null)
  const [selectedEditorTheme, setSelectedEditorTheme] = useState<EditorTheme | undefined>(DEFAULT_EDITOR_THEME);
  const [selectedTerminalTheme, setSelectedTerminalTheme] = useState<string | undefined>(DEFAULT_TERMINAL_THEME);
  const [isTerminalInputDisabled, setIsTerminalInputDisabled] = useState(false); // AI can run commands by default
  const [currentPowerShellInstance, setCurrentPowerShellInstance] = useState<PowerShellService | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);

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

  const fetchFileTree = useCallback(async () => {
    console.log("[Home Page] Fetching file tree...");
    try {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error(`Failed to fetch file tree: ${response.statusText}`);
      }
      const data: FileTreeItem[] = await response.json();
      console.log("[Home Page] File tree fetched successfully:", data);
      setFileTree(data);
      // Potentially update 'files' state here if EditorArea's FileExplorer should reflect this tree
      // For now, 'files' state is separate and static/managed differently.
    } catch (error) {
      console.error("[Home Page] Error fetching file tree:", error);
      toast.error("Could not load project files. Please refresh or check server logs.");
      setFileTree([]); // Set to empty on error
    }
  }, []);

  useEffect(() => {
    fetchFileTree();
  }, [fetchFileTree]);

  const handleAiOpenFileInEditor = useCallback(async (filePath: string) => {
    console.log(`[Home Page] AI request to open file: ${filePath}`);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch file: ${response.statusText}`);
      }
      const fileData: CodeFile = await response.json();

      setFiles(prevFiles => {
        const existingFileIndex = prevFiles.findIndex(f => f.path === fileData.path);
        if (existingFileIndex !== -1) {
          const updatedFiles = [...prevFiles];
          updatedFiles[existingFileIndex] = { ...updatedFiles[existingFileIndex], ...fileData };
          return updatedFiles;
        }
        return [...prevFiles, fileData];
      });
      setActiveFile(fileData);
      toast.success(`Opened file: ${filePath}`);
    } catch (error: any) {
      console.error(`[Home Page] Error opening file requested by AI (${filePath}):`, error);
      toast.error(`Failed to open file ${filePath}: ${error.message}`);
    }
  }, []);

  const handleAiExecuteTerminalCommand = useCallback(async (command: string): Promise<{ success: boolean; output: string }> => {
    console.log(`[Home Page] AI request to execute terminal command: ${command}`);
    if (isTerminalInputDisabled) {
      const msg = "Terminal execution is disabled by user settings.";
      toast.warning(msg);
      return { success: false, output: msg };
    }
    const instanceId = "main-terminal"; // Assuming a single shared terminal instance for now
    const psInstance = getPowerShellInstance(instanceId, "my_project"); // Ensure working directory
    try {
      const result = await psInstance.executeCommand(command);
      toast.info(`Command executed: ${command.substring(0, 30)}...`);
      return { success: !result.isError, output: result.data };
    } catch (error: any) {
      toast.error(`Terminal command failed: ${error.message}`);
      return { success: false, output: error.message };
    }
  }, [isTerminalInputDisabled]);

  const toggleTerminal = () => {
    setTerminalVisible(!terminalVisible)
  }

  return (
    <MainLayout
      files={files} // This should ideally come from fileTree processing or be merged
      activeFile={activeFile}
      setActiveFile={setActiveFile}
      terminalVisible={terminalVisible}
      toggleTerminal={toggleTerminal}
      onRefreshFileTree={fetchFileTree}
      onAiOpenFileInEditor={handleAiOpenFileInEditor}
      onAiExecuteTerminalCommand={handleAiExecuteTerminalCommand}
      selectedEditorTheme={selectedEditorTheme}
      setSelectedEditorTheme={setSelectedEditorTheme}
      selectedTerminalTheme={selectedTerminalTheme}
      setSelectedTerminalTheme={setSelectedTerminalTheme}
      isTerminalInputDisabled={isTerminalInputDisabled}
      setIsTerminalInputDisabled={setIsTerminalInputDisabled}
      fileTree={fileTree} // Pass the fetched fileTree
    />
  )
}
