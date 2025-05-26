// components/file-explorer-tabs/search-tab-content.tsx
"use client"

import * as React from "react"
import { useMemo } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CodeFile, FileTreeItem } from "@/types/file"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SearchTabContentProps {
  fileTree: FileTreeItem[]; // Changed from 'files'
  activeFile: CodeFile | null;
  onFileSelect: (file: FileTreeItem) => void; // Changed
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
        // Search in name and full path (which is already relative to my_project)
        const displayPath = node.path; // node.path is already what we want to show
        if (node.name.toLowerCase().includes(lowerTerm) || displayPath.toLowerCase().includes(lowerTerm)) {
          results.push({ ...node, path: displayPath }); // Ensure path is correctly set for display
        }
        if (node.isDirectory && node.children) {
          traverse(node.children, displayPath);
        }
      }
    };
    traverse(fileTree); // fileTree is already the root [] containing "my_project"
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
            key={`search-${item.id}`} // Use item.id which should be unique
            className={cn(
              "flex items-center space-x-2 p-1.5 hover:bg-muted/40 cursor-pointer rounded-sm",
              activeFile?.path === item.path && !item.isDirectory && "bg-muted/60"
            )}
            onClick={() => {
              if (!item.isDirectory) {
                onFileSelect(item); // Pass FileTreeItem
              } else {
                onActivateFilesTab(); 
                onExpandDirectoryInFilesTab(item.path); 
              }
            }}
          >
            {getFileIcon(item.name, item.path, item.isDirectory)}
            <span className="text-sm truncate flex-1">{item.name}</span>
            {/* Display path relative to rootDirectoryName for user clarity */}
            <span className="text-xs text-muted-foreground truncate ml-auto shrink-0 max-w-[50%]">
              {item.path.startsWith(rootDirectoryName + '/') ? item.path.substring(rootDirectoryName.length + 1) : item.path}
            </span>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}