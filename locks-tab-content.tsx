// components/file-explorer-tabs/locks-tab-content.tsx
"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { Lock, Unlock, ListFilter } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileTreeItem } from "@/types/file"
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, ScrollArea } from "@/components/ui" // Consolidated imports
import { toast } from "sonner"

interface LocksTabContentProps {
  fileTree: FileTreeItem[]; 
  getFileIcon: (fileName: string, itemPath?: string, isDirectory?: boolean) => React.ReactNode;
  isExplorerLocked: boolean;
  rootDirectoryName: string;
}

export function LocksTabContent({
  fileTree,
  getFileIcon,
  isExplorerLocked,
  rootDirectoryName,
}: LocksTabContentProps) {
  const [lockedItemPaths, setLockedItemPaths] = useState<Set<string>>(new Set())
  const [locksFilter, setLocksFilter] = useState<"all" | "files" | "folders">("all")

  const allLockableItems = useMemo((): FileTreeItem[] => {
    const items: FileTreeItem[] = [];
    const traverse = (nodes: FileTreeItem[]) => {
      for (const node of nodes) {
        items.push(node);
        if (node.isDirectory && node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(fileTree); 
    
    items.sort((a, b) => a.path.localeCompare(b.path));
    return items;
  }, [fileTree]);

  const filteredLockableItems = useMemo(() => {
    if (locksFilter === "all") return allLockableItems
    return allLockableItems.filter(item =>
      locksFilter === "files" ? !item.isDirectory : item.isDirectory
    )
  }, [allLockableItems, locksFilter])

  const toggleItemLock = (path: string) => {
    if (isExplorerLocked) {
      toast.error("Explorer is locked. Cannot change individual lock states.")
      return
    }
    setLockedItemPaths(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
        toast.info(`Unlocked: ${path.split('/').pop()}`)
      } else {
        newSet.add(path)
        toast.success(`Locked: ${path.split('/').pop()}`)
      }
      return newSet
    })
  }

  const areAllFilteredItemsEffectivelyLocked = useMemo(() => {
    if (isExplorerLocked) return true
    if (filteredLockableItems.length === 0) return false
    return filteredLockableItems.every(item => lockedItemPaths.has(item.path))
  }, [filteredLockableItems, lockedItemPaths, isExplorerLocked])

  const toggleLockAllFilteredItems = () => {
    if (isExplorerLocked) {
      toast.error("Explorer is locked. Cannot change lock states.")
      return
    }
    const pathsToToggle = filteredLockableItems.map(item => item.path)
    if (areAllFilteredItemsEffectivelyLocked) {
      setLockedItemPaths(prev => {
        const newSet = new Set(prev)
        pathsToToggle.forEach(path => newSet.delete(path))
        return newSet
      })
      toast.info(`Unlocked all shown ${locksFilter} items.`)
    } else {
      setLockedItemPaths(prev => new Set([...Array.from(prev), ...pathsToToggle]))
      toast.success(`Locked all shown ${locksFilter} items.`)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-2 border-b border-border flex items-center justify-between">
        <Button
          onClick={toggleLockAllFilteredItems}
          disabled={isExplorerLocked || filteredLockableItems.length === 0}
          variant="outline"
          size="sm"
        >
          {areAllFilteredItemsEffectivelyLocked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
          {areAllFilteredItemsEffectivelyLocked ? "Unlock Shown" : "Lock Shown"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ListFilter className="h-4 w-4 mr-2" />
              Filter: {locksFilter.charAt(0).toUpperCase() + locksFilter.slice(1)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={locksFilter} onValueChange={(value) => setLocksFilter(value as any)}>
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="files">Files Only</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="folders">Folders Only</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollArea className="flex-1 p-2">
        {filteredLockableItems.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No {locksFilter !== "all" ? locksFilter : ""} items to display.</p>
        )}
        {filteredLockableItems.map((item) => {
          const isItemEffectivelyLocked = isExplorerLocked || lockedItemPaths.has(item.path)
          return (
            <div
              key={`lock-${item.id}`} 
              className="flex items-center justify-between p-1.5 hover:bg-muted/20 rounded-sm"
            >
              <div className="flex items-center space-x-2 truncate">
                {getFileIcon(item.name, item.path, item.isDirectory)}
                <span className="text-sm truncate">{item.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => toggleItemLock(item.path)}
                disabled={isExplorerLocked}
                title={isExplorerLocked ? "Explorer Locked" : (isItemEffectivelyLocked ? "Unlock item" : "Lock item")}
              >
                {isItemEffectivelyLocked ? <Lock className="h-4 w-4 text-destructive" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          )
        })}
      </ScrollArea>
    </div>
  )
}