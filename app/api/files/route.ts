// app/api/files/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { CodeFile, FileTreeItem } from '@/types/file';

const ROOT_PROJECT_DIR = 'my_project';
const projectRootPath = path.resolve(process.cwd(), ROOT_PROJECT_DIR);

interface ApiFileEntry {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: ApiFileEntry[];
  content?: string;
  language?: string;
}

async function getFileLanguage(filePath: string): Promise<string> {
  const extension = path.extname(filePath).toLowerCase().substring(1);
  switch (extension) {
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'py': return 'python';
    case 'txt': return 'plaintext';
    default: return 'plaintext';
  }
}

async function readDirectoryRecursive(dirPath: string, relativePathBase: string = ""): Promise<ApiFileEntry[]> {
  const functionStartTime = Date.now();
  console.log(`[API Files DEBUG] readDirectoryRecursive START for dirPath: "${dirPath}", relativePathBase: "${relativePathBase}"`);

  try {
    await fs.access(dirPath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      if (dirPath === projectRootPath) {
        try {
          await fs.mkdir(projectRootPath, { recursive: true });
          console.log(`[API Files DEBUG] Created missing project root directory: ${projectRootPath}`);
        } catch (mkdirError) {
          console.error(`[API Files DEBUG] Failed to create project root directory ${projectRootPath}:`, mkdirError);
          return [];
        }
      } else {
        console.warn(`[API Files DEBUG] Directory not found (not creating): ${dirPath}`);
        return [];
      }
    } else {
      console.error(`[API Files DEBUG] Error accessing directory ${dirPath}:`, e);
      throw e;
    }
  }

  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (readdirError) {
    console.error(`[API Files DEBUG] Error reading directory contents for ${dirPath}:`, readdirError);
    return []; // Return empty if we can't read the directory
  }
  
  console.log(`[API Files DEBUG] Found ${entries.length} entries in "${dirPath}"`);
  const filesAndFolders: ApiFileEntry[] = [];

  for (const entry of entries) {
    const entryProcessingStartTime = Date.now();
    // Explicitly skip common large/irrelevant directories
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next' || entry.name === 'out' || entry.name === 'build') {
        console.log(`[API Files DEBUG] SKIPPING common large directory: "${entry.name}" in "${dirPath}"`);
        continue;
    }

    const entryAbsolutePath = path.join(dirPath, entry.name);
    const entryRelativePath = path.join(relativePathBase, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      console.log(`[API Files DEBUG] Processing subdirectory: "${entryAbsolutePath}"`);
      filesAndFolders.push({
        id: entryRelativePath,
        name: entry.name,
        path: entryRelativePath,
        isDirectory: true,
        children: await readDirectoryRecursive(entryAbsolutePath, entryRelativePath),
      });
    } else {
      filesAndFolders.push({
        id: entryRelativePath,
        name: entry.name,
        path: entryRelativePath,
        isDirectory: false,
        language: await getFileLanguage(entry.name),
      });
    }
    console.log(`[API Files DEBUG] Processed entry "${entry.name}" in ${Date.now() - entryProcessingStartTime}ms`);
  }

  filesAndFolders.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
  console.log(`[API Files DEBUG] readDirectoryRecursive END for dirPath: "${dirPath}" in ${Date.now() - functionStartTime}ms`);
  return filesAndFolders;
}

export async function GET(request: Request) {
  const overallStartTime = Date.now();
  console.log(`[API Files GET] Request received at ${new Date(overallStartTime).toISOString()}`);
  const { searchParams } = new URL(request.url);
  const filePathParam = searchParams.get('path');

  try {
    if (filePathParam) {
      const fullFilePath = path.join(projectRootPath, filePathParam);
      if (!fullFilePath.startsWith(projectRootPath)) {
        console.warn(`[API Files GET] Invalid file path requested (path traversal attempt): ${filePathParam}`);
        return NextResponse.json({ error: 'Invalid file path requested.' }, { status: 400 });
      }
      try {
        const content = await fs.readFile(fullFilePath, 'utf-8');
        const language = await getFileLanguage(filePathParam);
        console.log(`[API Files GET] File content for '${filePathParam}' served in ${Date.now() - overallStartTime}ms`);
        return NextResponse.json({
          id: filePathParam,
          name: path.basename(filePathParam),
          path: filePathParam,
          content,
          language,
          isDirectory: false,
        } as CodeFile);
      } catch (error) {
        console.error(`[API Files GET] Error reading file ${filePathParam}:`, error);
        return NextResponse.json({ error: `File not found or unreadable: ${filePathParam}` }, { status: 404 });
      }
    } else {
      console.log(`[API Files GET] Starting to read directory structure for project root: ${projectRootPath}`);
      const structure = await readDirectoryRecursive(projectRootPath);
      console.log(`[API Files GET] Directory structure served in ${Date.now() - overallStartTime}ms`);
      return NextResponse.json(structure);
    }
  } catch (error) {
    console.error(`[API Files GET] Error in GET handler after ${Date.now() - overallStartTime}ms:`, error);
    return NextResponse.json({ error: "Failed to process file/directory request." }, { status: 500 });
  }
}

// POST function remains the same
export async function POST(request: Request) {
  const { targetPath: relativePath, content, type } = await request.json();

  if (!relativePath || typeof relativePath !== 'string') {
    return NextResponse.json({ error: 'Invalid targetPath provided.' }, { status: 400 });
  }
  if (!type || typeof type !== 'string' || !['createFile', 'createFolder'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type provided. Must be "createFile" or "createFolder".' }, { status: 400 });
  }

  if (type === 'createFile' && typeof content !== 'string') {
    return NextResponse.json({ error: 'Content is required and must be a string for file creation.' }, { status: 400 });
  }

  const fullPath = path.join(projectRootPath, relativePath);

  if (!fullPath.startsWith(projectRootPath)) {
    return NextResponse.json({ error: 'Invalid file path requested (path traversal attempt).' }, { status: 400 });
  }

  try {
    // Ensure parent directory exists for file creation or folder creation
    const parentDir = path.dirname(fullPath);
    // Create parent directory only if it's not the project root itself
    if (parentDir !== projectRootPath && parentDir !== fullPath) await fs.mkdir(parentDir, { recursive: true });

    if (type === 'createFolder') {
      await fs.mkdir(fullPath, { recursive: true });
      return NextResponse.json({ message: `Directory created: ${relativePath}` }, { status: 201 });
    } else { // type === 'createFile'
      await fs.writeFile(fullPath, content || '');
      return NextResponse.json({ message: `File created/updated: ${relativePath}` }, { status: 201 });
    }
  } catch (error: any) {
    console.error(`Error creating ${type === 'createFolder' ? 'directory' : 'file'} ${relativePath}:`, error);
    return NextResponse.json({ error: `Failed to create ${type === 'createFolder' ? 'directory' : 'file'}: ${error.message}` }, { status: 500 });
  }
}