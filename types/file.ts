// types/file.ts
export interface CodeFile {
  id: string; // We'll generate this on the client, or use path as ID
  name: string;
  path: string; // This will be path relative to 'my_project'
  content: string;
  language: string;
  isDirectory?: false; // Explicitly mark as not a directory
}

export interface FileTreeItem {
  id: string; // We'll generate this on the client, or use path as ID
  name: string;
  path: string; // This will be path relative to 'my_project'
  isDirectory: boolean;
  children?: FileTreeItem[];
  language?: string; // For files
  // These were for client-side filtering, might not be needed if search is server-side
  // isMatch?: boolean 
  // hasMatchingDescendant?: boolean
}