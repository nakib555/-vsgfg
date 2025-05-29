// components/file-explorer-tabs/files-tab-content.tsx
"use client"

import * as React from "react"
import { useCallback } from "react"
import {
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CodeFile, FileTreeItem } from "@/types/file"
import { ScrollArea } from "@/components/ui" // Consolidated import

interface FilesTabContentProps {
  fileTree: FileTreeItem[];
  activeFile: CodeFile | null;
  onFileSelect: (file: FileTreeItem) => void;
  getFileIcon: (fileName: string, itemPath?: string, isDirectory?: boolean, isActive?: boolean) => React.ReactNode;
  isExplorerLocked: boolean;
  expandedDirs: Set<string>;
  setExpandedDirs: React.Dispatch<React.SetStateAction<Set<string>>>;
  rootDirectoryName: string;
  onFileSystemUpdate: () => Promise<void>;
}

export function FilesTabContent({
  fileTree,
  activeFile,
  onFileSelect,
  getFileIcon,
  isExplorerLocked,
  expandedDirs,
  setExpandedDirs,
  rootDirectoryName,
  onFileSystemUpdate,
}: FilesTabContentProps) {

  const fileTreeToRender = fileTree;

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(path)) newExpanded.delete(path)
      else newExpanded.add(path)
      return newExpanded
    })
  }, [setExpandedDirs])

  const renderFileTreeItem = (item: FileTreeItem, depth = 0): React.ReactNode => {
    const isDirExpanded = item.isDirectory && expandedDirs.has(item.path)
    const isActive = !item.isDirectory && activeFile?.path === item.path

    const paddingLeftValue = 0.5 + depth * 0.75;
    const paddingLeftStyle = { paddingLeft: `${paddingLeftValue}rem` };

    const chevronColor = isActive ? "text-slate-300" : "text-slate-500 dark:text-slate-500";

    return (
      <div key={item.id} className="group/treeitem text-sm leading-tight">
        <div
          className={cn(
            "flex items-center justify-between py-[2px] pr-1 hover:bg-slate-700/20 cursor-pointer rounded-[3px]", 
            isActive && "bg-[#3A3D54] text-slate-50",
            !isActive && "text-slate-400 hover:text-slate-200",
          )}
          style={paddingLeftStyle}
        >
          <div
            className="flex items-center space-x-1 flex-1 truncate"
            onClick={() => {
              if (item.isDirectory) {
                toggleDir(item.path);
              } else {
                onFileSelect(item);
              }
            }}
          >
            {item.isDirectory ? (
              isDirExpanded ? (
                <ChevronDown className={cn("h-4 w-4 shrink-0", chevronColor)} />
              ) : (
                <ChevronRight className={cn("h-4 w-4 shrink-0", chevronColor)} />
              )
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <div className="flex items-center justify-center w-4 h-4 mr-0.5">
              {getFileIcon(item.name, item.path, item.isDirectory, isActive)}
            </div>
            <span className={cn("truncate pt-px", isActive ? "text-slate-50" : "text-slate-300")}>{item.name}</span>
          </div>
        </div>
        {item.isDirectory && isDirExpanded && item.children && (
          <div>{item.children.map((child) => renderFileTreeItem(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 p-1 pr-0.5">
      {fileTreeToRender.length === 0 && (
           <p className="text-sm text-slate-500 px-2 py-4 text-center">No files to display or project empty.</p>
      )}
      {fileTreeToRender.map((item) => renderFileTreeItem(item, 0))}
    </ScrollArea>
  )
}