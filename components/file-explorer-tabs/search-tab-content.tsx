// components/file-explorer-tabs/search-tab-content.tsx
"use client"

import * as React from "react"
import { useMemo } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CodeFile, FileTreeItem } from "@/types/file"
import { Input, ScrollArea } from "@/components/ui" // Consolidated import

interface SearchTabContentProps {
  fileTree: FileTreeItem[]; 
  activeFile: CodeFile | null;
  onFileSelect: (file: FileTreeItem) => void; 
  getFileIcon: (fileName: string, itemPath?: string, isDirectory?: boolean) => React.ReactNode;
  onActivateFilesTab: () => void;
  onExpandDirectoryInFilesTab: (dirPath: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  rootDirectoryName: string;
}

export function SearchTabContent({
  fileTree,
  activeFile,
  onFileSelect,
  getFileIcon,
  onActivateFilesTab,
  onExpandDirectoryInFilesTab,
  searchTerm,
  setSearchTerm,
  rootDirectoryName,
}: SearchTabContentProps) {

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowerTerm = searchTerm.toLowerCase();
    const results: FileTreeItem[] = [];
    const traverse = (nodes: FileTreeItem[], currentDisplayPathPrefix = "") => {
      for (const node of nodes) {
        const displayPath = node.path; 
        if (node.name.toLowerCase().includes(lowerTerm) || displayPath.toLowerCase().includes(lowerTerm)) {
          results.push({ ...node, path: displayPath }); 
        }
        if (node.isDirectory && node.children) {
          traverse(node.children, displayPath);
        }
      }
    };
    traverse(fileTree); 
    return results;
  }, [fileTree, searchTerm, rootDirectoryName]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search all files and folders..."
            className="pl-8 h-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        {searchTerm.trim() === "" && (
          <p className="text-sm text-muted-foreground text-center py-4">Enter a search term.</p>
        )}
        {searchTerm.trim() !== "" && searchResults.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No results for "{searchTerm}".</p>
        )}
        {searchResults.map((item) => (
          <div
            key={`search-${item.id}`} 
            className={cn(
              "flex items-center space-x-2 p-1.5 hover:bg-muted/40 cursor-pointer rounded-sm",
              activeFile?.path === item.path && !item.isDirectory && "bg-muted/60"
            )}
            onClick={() => {
              if (!item.isDirectory) {
                onFileSelect(item); 
              } else {
                onActivateFilesTab();
                onExpandDirectoryInFilesTab(item.path);
              }
            }}
          >
            {getFileIcon(item.name, item.path, item.isDirectory)}
            <span className="text-sm truncate flex-1">{item.name}</span>
            <span className="text-xs text-muted-foreground truncate ml-auto shrink-0 max-w-[50%]">
              {item.path.startsWith(rootDirectoryName + '/') ? item.path.substring(rootDirectoryName.length + 1) : item.path}
            </span>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}