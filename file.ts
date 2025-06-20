export interface CodeFile {
  id: string
  name: string
  path: string
  content: string
  language: string
}

export interface FileTreeItem {
  id: string;
  name: string;
  path: string; // Relative path from project root
  isDirectory: boolean;
  children?: FileTreeItem[]; // For directories
  language?: string; // Optional: For files, if known at tree build time
}
