// components/file-explorer.tsx
"use client"

import * as React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Folder as FolderIconMdi,
  FolderOpen as FolderOpenIconMdi,
  FolderCogOutline,       // For services, lib, utils, hooks, config folders
  FolderZipOutline,       // For src, app folders (replacement for FolderCodeOutline)
  FolderMultipleOutline,  // For components, ui folders (replacement for FolderPuzzleOutline)
  Npm as NpmIcon,           // For node_modules (replacement for FolderNpmOutline)
  Git as GitIconMdi,
  FileDocumentOutline,
  LanguageJavascript,
  LanguageTypescript,
  LanguageHtml5,
  LanguageCss3,
  LanguageMarkdown,
  CodeJson as JsonIcon,
  PackageVariantClosed as PackageJsonIcon,
  LockOutline as LockIconMdi,
  FileImageOutline,
  FileSettingsOutline,
  CogOutline,
  FolderMultipleOutline as FolderExplorerIconMdi, // For "Files" tab
  Magnify as SearchIconMdi,
  Lock as LockTabIconMdi,
} from "mdi-material-ui";

import { ChevronRight, ChevronDown } from "lucide-react";

import type { CodeFile, FileTreeItem } from "@/types/file"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils";

import { FilesTabContent } from "./file-explorer-tabs/files-tab-content"
import { SearchTabContent } from "./file-explorer-tabs/search-tab-content"
import { LocksTabContent } from "./file-explorer-tabs/locks-tab-content"

interface FileExplorerProps {
  fileTree: FileTreeItem[];
  activeFile: CodeFile | null;
  onFileSelect: (file: FileTreeItem) => void;
  rootDirectoryName: string;
  onFileSystemUpdate: () => Promise<void>;
}

export default function FileExplorer({
  fileTree,
  activeFile,
  onFileSelect,
  rootDirectoryName,
  onFileSystemUpdate,
}: FileExplorerProps) {
  const [activeExplorerTab, setActiveExplorerTab] = useState<"files" | "search" | "locks">("files")
  const [isExplorerLocked, setIsExplorerLocked] = useState(false)

  const initialExpandedDirs = useMemo(() => {
    const defaultSet = new Set<string>();
    if (fileTree.length > 0 && fileTree[0].name === rootDirectoryName) {
      defaultSet.add(fileTree[0].path);
      fileTree[0].children?.forEach(child => {
        if (child.isDirectory && (child.name === 'src' || child.name === 'app' || child.name === 'components' || child.name === 'services')) {
          defaultSet.add(child.path);
        }
      });
    }
    return defaultSet;
  }, [fileTree, rootDirectoryName]);

  const [expandedDirsForFilesTab, setExpandedDirsForFilesTab] = useState<Set<string>>(initialExpandedDirs);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");

  useEffect(() => {
    setExpandedDirsForFilesTab(initialExpandedDirs);
  }, [initialExpandedDirs]);

  const getFileIcon = useCallback((fileName: string, itemPath?: string, isDirectory?: boolean, isActive?: boolean): React.ReactNode => {
    const iconProps = { fontSize: "small" as const, className: "shrink-0" };
    const defaultIconColor = isActive ? "text-slate-100" : "text-slate-400 dark:text-slate-500";
    const folderColor = isActive ? "text-slate-100" : "text-slate-400 dark:text-slate-500";


    if (isDirectory) {
      const isExpanded = expandedDirsForFilesTab.has(itemPath || "");
      const folderName = fileName.toLowerCase();

      if (folderName === 'src' || folderName === 'app') return <FolderZipOutline {...iconProps} className={cn(iconProps.className, folderColor)} />;
      if (folderName === 'components' || folderName === 'ui') return <FolderMultipleOutline {...iconProps} className={cn(iconProps.className, folderColor)} />;
      if (folderName === 'node_modules') return <NpmIcon {...iconProps} className={cn(iconProps.className, folderColor)} />; // Using Npm icon directly
      if (folderName === '.git') return <GitIconMdi {...iconProps} className={cn(iconProps.className, folderColor)} />;
      if (folderName === 'services' || folderName === 'lib' || folderName === 'utils' || folderName === 'hooks' || folderName === 'config') return <FolderCogOutline {...iconProps} className={cn(iconProps.className, folderColor)} />;
      
      return isExpanded ?
        <FolderOpenIconMdi {...iconProps} className={cn(iconProps.className, folderColor)} /> :
        <FolderIconMdi {...iconProps} className={cn(iconProps.className, folderColor)} />;
    }

    const lowerFileName = fileName.toLowerCase();
    const extension = lowerFileName.split(".").pop();

    if (lowerFileName === 'package.json') return <PackageJsonIcon {...iconProps} className={cn(iconProps.className, isActive ? "text-slate-100" : "text-green-500/80 dark:text-green-400/80")} />;
    if (lowerFileName === 'package-lock.json') return <LockIconMdi {...iconProps} className={cn(iconProps.className, isActive ? "text-slate-100" : "text-orange-400/80 dark:text-orange-300/80")} />;
    if (lowerFileName.startsWith('.env')) return <FileSettingsOutline {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
    if (lowerFileName === 'vite.config.ts' || lowerFileName === 'tailwind.config.ts' || lowerFileName === 'next.config.mjs' || lowerFileName === 'postcss.config.mjs') return <CogOutline {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
    if (lowerFileName === 'readme.md') return <LanguageMarkdown {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;


    switch (extension) {
      case "js":
      case "jsx":
        return <LanguageJavascript {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
      case "ts":
      case "tsx":
        return <LanguageTypescript {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
      case "json":
        return <JsonIcon {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
      case "html":
        return <LanguageHtml5 {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
      case "css":
      case "scss":
      case "less":
        return <LanguageCss3 {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
      case "md":
      case "mdx":
        return <LanguageMarkdown {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
      case "ico":
      case "webp":
        return <FileImageOutline {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
      case "gitignore":
        return <GitIconMdi {...iconProps} className={cn(iconProps.className, defaultIconColor, "opacity-70")} />;
      default:
        return <FileDocumentOutline {...iconProps} className={cn(iconProps.className, defaultIconColor)} />;
    }
  }, [expandedDirsForFilesTab]);

  const handleExpandDirectoryInFilesTab = useCallback((dirPath: string) => {
    setExpandedDirsForFilesTab(prev => {
      const newSet = new Set(prev);
      newSet.add(dirPath);
      const parts = dirPath.split('/');
      for (let i = 1; i < parts.length; i++) {
        newSet.add(parts.slice(0, i).join('/'));
      }
      return newSet;
    });
  }, []);

  const filesTabFileTree = useMemo(() => {
    return fileTree;
  }, [fileTree]);

  return (
    <div className="flex flex-col h-full bg-[#21252B] text-slate-300">
      <Tabs
        value={activeExplorerTab}
        onValueChange={(value) => setActiveExplorerTab(value as any)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-3 shrink-0 rounded-none border-b border-slate-700/50 bg-[#282C34] h-9">
          <TabsTrigger value="files" className="data-[state=active]:bg-[#21252B] data-[state=active]:text-slate-100 text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs h-full">
            <FolderExplorerIconMdi style={{ fontSize: '1.1rem' }} /> Files
          </TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:bg-[#21252B] data-[state=active]:text-slate-100 text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs h-full">
            <SearchIconMdi style={{ fontSize: '1.1rem' }} /> Search
          </TabsTrigger>
          <TabsTrigger value="locks" className="data-[state=active]:bg-[#21252B] data-[state=active]:text-slate-100 text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs h-full">
            <LockTabIconMdi style={{ fontSize: '1.1rem' }} /> Locks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="flex-1 overflow-y-auto mt-0">
          <FilesTabContent
            fileTree={filesTabFileTree}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
            getFileIcon={getFileIcon}
            isExplorerLocked={isExplorerLocked}
            expandedDirs={expandedDirsForFilesTab}
            setExpandedDirs={setExpandedDirsForFilesTab}
            rootDirectoryName={rootDirectoryName}
            onFileSystemUpdate={onFileSystemUpdate}
          />
        </TabsContent>

        <TabsContent value="search" className="flex-1 overflow-y-auto mt-0">
          <SearchTabContent
            fileTree={filesTabFileTree}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
            getFileIcon={getFileIcon}
            onActivateFilesTab={() => setActiveExplorerTab("files")}
            onExpandDirectoryInFilesTab={handleExpandDirectoryInFilesTab}
            searchTerm={globalSearchTerm}
            setSearchTerm={setGlobalSearchTerm}
            rootDirectoryName={rootDirectoryName}
          />
        </TabsContent>

        <TabsContent value="locks" className="flex-1 overflow-y-auto mt-0">
          <LocksTabContent
            fileTree={filesTabFileTree}
            getFileIcon={getFileIcon}
            isExplorerLocked={isExplorerLocked}
            rootDirectoryName={rootDirectoryName}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}