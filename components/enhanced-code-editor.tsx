'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Copy, 
  Download, 
  Save, 
  Maximize2, 
  FileText, 
  Code2,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface File {
  id: string;
  name: string;
  content: string;
  type: 'file' | 'folder';
  language?: string;
}

interface EnhancedCodeEditorProps {
  file: File | null;
  theme?: string;
  onFileUpdate?: (file: File) => void;
}

export function EnhancedCodeEditor({ file, theme = 'dark', onFileUpdate }: EnhancedCodeEditorProps) {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  useEffect(() => {
    if (file) {
      setContent(file.content);
    }
  }, [file]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Calculate cursor position
    const textarea = e.target;
    const lines = newContent.substring(0, textarea.selectionStart).split('\n');
    setCursorPosition({
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    });
  };

  const handleSave = () => {
    if (file && onFileUpdate) {
      const updatedFile = { ...file, content };
      onFileUpdate(updatedFile);
      toast.success('File saved successfully');
    }
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Code copied to clipboard');
  };

  const handleDownload = () => {
    if (!file) return;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  const handleRun = () => {
    if (file?.language === 'javascript' || file?.language === 'typescript') {
      try {
        // Simple code execution for demo purposes
        const result = eval(content);
        toast.success(`Code executed: ${result}`);
      } catch (error) {
        toast.error(`Execution error: ${error}`);
      }
    } else {
      toast.info('Code execution not supported for this file type');
    }
  };

  const getLanguageIcon = (language?: string) => {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return <Code2 className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getFileStats = () => {
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).filter(word => word.length > 0).length;
    const characters = content.length;
    
    return { lines, words, characters };
  };

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No file selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Select a file from the explorer to start editing
          </p>
        </div>
      </div>
    );
  }

  const stats = getFileStats();

  return (
    <div className={`flex-1 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          {getLanguageIcon(file.language)}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {file.name}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Badge variant="secondary" className="text-xs">
                {file.language || 'text'}
              </Badge>
              {isEditing && (
                <span className="text-orange-500">• Editing</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-gray-600 dark:text-gray-300"
          >
            <Copy className="w-4 h-4" />
          </Button>
          
          {(file.language === 'javascript' || file.language === 'typescript') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRun}
              className="text-green-600 dark:text-green-400"
            >
              <Play className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-blue-600 dark:text-blue-400"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="text-green-600 dark:text-green-400"
            >
              <Save className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-600 dark:text-gray-300"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        {isEditing ? (
          <textarea
            value={content}
            onChange={handleContentChange}
            className="w-full h-full p-4 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-none outline-none resize-none"
            placeholder="Start typing..."
            spellCheck={false}
          />
        ) : (
          <div className="relative h-full">
            <pre className="w-full h-full p-4 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-auto">
              <code>{content}</code>
            </pre>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 opacity-0 hover:opacity-100 transition-opacity"
            >
              <Settings className="w-4 h-4" />
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{stats.lines} lines</span>
          <span>{stats.words} words</span>
          <span>{stats.characters} characters</span>
        </div>
        
        {isEditing && (
          <div className="flex items-center space-x-4">
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
            <Badge variant="outline" className="text-xs">
              {file.language || 'text'}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}