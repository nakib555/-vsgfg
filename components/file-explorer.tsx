"use client"
// components/file-explorer.tsx
// THIS FILE IS NOW THE MAIN FILE EXPLORER AND SIDEBAR UI COMBINED
// IF YOU MEANT TO EDIT THE SIDEBAR FOR AI CHAT, EDIT `sidebar.tsx` INSTEAD.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Folder, FileText as FileIcon, ChevronRight, ChevronDown, Plus, MoreHorizontal,
  RefreshCcw, Search as SearchIcon, Settings2, Lock, Unlock, FolderGit2, FileCode2, FileJson, FileImage, FileArchive, FileTerminal, FileLock2, FileSearch, FolderOpen, FolderClosed, FolderPlus, FilePlus2, FileUp, Pencil, Trash2, Copy as CopyIcon, ExternalLink, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CodeFile, FileTreeItem } from "@/types/file";
import { Button, ScrollArea, Tabs, TabsList, TabsTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger as TooltipTriggerPrimitive, Input, Checkbox, Label } from "@/components/ui"; // Consolidated imports
import { FilesTabContent } from "./file-explorer-tabs/files-tab-content";
import { SearchTabContent } from "./file-explorer-tabs/search-tab-content";
import { LocksTabContent } from "./file-explorer-tabs/locks-tab-content";
import { toast } from "sonner";

interface FileTreeItem {
  id: string
  name: string
  path: string
  isDirectory?: boolean
  children?: FileTreeItem[]
}

interface FileExplorerProps {
  files: CodeFile[]
  activeFile: CodeFile | null
  onFileSelect: (file: CodeFile) => void
}

export default function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["src"]))
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)

  // Convert flat files array to tree structure
  const buildFileTree = (files: CodeFile[]): FileTreeItem[] => {
    const root: FileTreeItem[] = []
    const dirs: Record<string, FileTreeItem> = {}

    // First pass: create all directories
    files.forEach((file) => {
      const pathParts = file.path.split("/")

      // Create directories
      let currentPath = ""
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i]
        const parentPath = currentPath
        currentPath = currentPath ? `${currentPath}/${part}` : part

        if (!dirs[currentPath]) {
          const dirItem: FileTreeItem = {
            id: `dir-${currentPath}`,
            name: part,
            path: currentPath,
            isDirectory: true,
            children: [],
          }

          dirs[currentPath] = dirItem

          if (parentPath) {
            dirs[parentPath].children = dirs[parentPath].children || []
            dirs[parentPath].children.push(dirItem)
          } else {
            root.push(dirItem)
          }
        }
      }
    })

    // Second pass: add files to directories
    files.forEach((file) => {
      const pathParts = file.path.split("/")
      const fileName = pathParts[pathParts.length - 1]
      const dirPath = pathParts.slice(0, -1).join("/")

      const fileItem: FileTreeItem = {
        id: file.id,
        name: fileName,
        path: file.path,
        language: file.language, // Add language from CodeFile
      };

      if (dirPath && dirs[dirPath]) {
        // Ensure children array exists if it's a directory item
        if (!dirs[dirPath].children) {
          dirs[dirPath].children = [];
        }
        dirs[dirPath].children!.push(fileItem); // Use non-null assertion if confident children is initialized
      } else {
        // File is in the root
        root.push(fileItem);
      }
    });

    return root;
  };

  const fileTree = buildFileTree(files);

  const toggleDir = (path: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedDirs(newExpanded)
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    if (extension === "js" || extension === "jsx") {
      return <FileCode2 className="h-4 w-4 text-yellow-400" />
    } else if (extension === "ts" || extension === "tsx") {
      return <FileCode2 className="h-4 w-4 text-blue-400" />
    } else if (extension === "json") {
      return <FileCode2 className="h-4 w-4 text-green-400" />
    } else if (extension === "html") {
      return <FileCode2 className="h-4 w-4 text-orange-400" />
    } else if (extension === "css") {
      return <FileCode2 className="h-4 w-4 text-purple-400" />
    } else if (extension === "md") {
      return <FileIcon className="h-4 w-4 text-gray-400" />
    } else {
      return <FileIcon className="h-4 w-4 text-gray-400" />
    }
  }

  const handleAddFile = (directory?: string) => {
    console.log("Add file to directory:", directory || "root")
    // In a real implementation, this would open a dialog to create a new file
    alert(`Adding a new file to ${directory || "root"} (simulated)`)
  }

  const handleAddFolder = (directory?: string) => {
    console.log("Add folder to directory:", directory || "root")
    // In a real implementation, this would open a dialog to create a new folder
    alert(`Adding a new folder to ${directory || "root"} (simulated)`)
  }

  const renderFileTreeItem = (item: FileTreeItem) => {
    const isExpanded = item.isDirectory && expandedDirs.has(item.path)
    const isActive = !item.isDirectory && activeFile?.path === item.path

    return (
      <div key={item.id}>
        <div
          className={cn(
            "flex items-center justify-between py-1 px-2 hover:bg-muted/40 cursor-pointer rounded-sm",
            isActive && "bg-muted/60",
          )}
        >
          <div
            className="flex items-center space-x-2 flex-1"
            onClick={() => {
              if (item.isDirectory) {
                toggleDir(item.path)
              } else {
                const file = files.find((f) => f.path === item.path)
                if (file) onFileSelect(file)
              }
            }}
          >
            {item.isDirectory ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Folder className="h-4 w-4 text-blue-500" />
              </>
            ) : (
              <>
                <span className="w-4" />
                {getFileIcon(item.name)}
              </>
            )}
            <span className="truncate text-sm">{item.name}</span>
          </div>

          {item.isDirectory && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAddFile(item.path)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddFolder(item.path)}>
                  <Folder className="h-4 w-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {item.isDirectory && isExpanded && item.children && (
          <div className="pl-4">{item.children.map((child) => renderFileTreeItem(child))}</div>
        )}
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="font-medium">Explorer</span>
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddFile()} title="New File">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddFolder()} title="New Folder">
            <Folder className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {fileTree.map((item) => renderFileTreeItem(item))}
    </div>
  )
}
