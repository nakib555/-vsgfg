// components/code-diff-viewer.tsx
"use client"

import React, { useMemo } from 'react';
import { CodeFile } from '@/types/file';
import { ScrollArea, Badge } from '@/components/ui'; // Consolidated import
import { FileText, GitCompareArrows } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeDiffViewerProps {
  file: CodeFile | null;
  onClose?: () => void;
}

const generateDiff = (original: string, current: string) => {
  const originalLines = original.split('\n');
  const currentLines = current.split('\n');
  const maxLen = Math.max(originalLines.length, currentLines.length);
  const diffResult: Array<{ type: 'common' | 'added' | 'removed'; originalLine?: string; currentLine?: string; originalLineNum?: number; currentLineNum?: number }> = [];

  let originalLineNum = 1;
  let currentLineNum = 1;

  for (let i = 0; i < maxLen; i++) {
    const oLine = originalLines[i];
    const cLine = currentLines[i];

    if (oLine !== undefined && cLine !== undefined) {
      if (oLine === cLine) {
        diffResult.push({ type: 'common', originalLine: oLine, currentLine: cLine, originalLineNum: originalLineNum++, currentLineNum: currentLineNum++ });
      } else {
        if (oLine !== undefined) {
          diffResult.push({ type: 'removed', originalLine: oLine, originalLineNum: originalLineNum++ });
        }
        if (cLine !== undefined) {
          diffResult.push({ type: 'added', currentLine: cLine, currentLineNum: currentLineNum++ });
        }
      }
    } else if (oLine !== undefined) {
      diffResult.push({ type: 'removed', originalLine: oLine, originalLineNum: originalLineNum++ });
    } else if (cLine !== undefined) {
      diffResult.push({ type: 'added', currentLine: cLine, currentLineNum: currentLineNum++ });
    }
  }
  return diffResult;
};


const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({ file }) => {
  const originalContent = useMemo(() => {
    if (!file) return "";
    if (file.name === "example.js") {
      return "function greet(name) {\n  return `Hi, ${name}!`; // Original greeting\n}\n\nconsole.log(greet('Monaco User'));\n// An old line that was removed";
    }
    const lines = file.content.split('\n');
    if (lines.length > 2) {
      return lines.slice(0, Math.max(0, lines.length - 2)).join('\n') + "\n// Original line 1 removed for diff demo\n// Original line 2 removed for diff demo";
    }
    return file.content + "\n// Original content was slightly different for demo.";
  }, [file]);

  const diff = useMemo(() => {
    if (!file) return [];
    return generateDiff(originalContent, file.content);
  }, [file, originalContent]);

  const hasChanges = useMemo(() => diff.some(d => d.type === 'added' || d.type === 'removed'), [diff]);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 bg-background h-full">
        <GitCompareArrows size={48} className="mb-4 opacity-50" />
        <p>Select a file to view differences.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between p-2.5 border-b border-border shrink-0 h-11 bg-muted">
        <div className="flex items-center space-x-2">
          <GitCompareArrows size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground truncate" title={file.path}>
            {file.path}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges ? (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">Changes</Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-500/20 dark:bg-green-700/50 border-green-500/40 dark:border-green-600 text-green-700 dark:text-green-300 text-xs px-2 py-0.5">No Changes</Badge>
          )}
        </div>
      </div>

      {!hasChanges ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
          <FileText size={64} className="mb-6 opacity-30" />
          <h3 className="text-xl font-semibold text-foreground">Files are identical</h3>
          <p className="text-sm">Both versions match exactly.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-1 text-xs text-muted-foreground font-medium">
            Showing differences
          </div>
          <ScrollArea className="flex-1 bg-muted/30 rounded-md m-2 mt-0 p-0.5">
            <div className="p-3 font-mono text-[13px] leading-relaxed">
              {diff.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex -mx-3 px-3",
                    line.type === 'added' && 'bg-green-500/10 dark:bg-green-600/15', 
                    line.type === 'removed' && 'bg-red-500/10 dark:bg-red-600/15'    
                  )}
                >
                  <span
                    className={cn(
                      "w-8 text-right pr-3 select-none opacity-60",
                      line.type === 'removed' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                    )}
                  >
                    {line.type !== 'added' ? line.originalLineNum : ' '}
                  </span>
                  <span
                    className={cn(
                      "w-8 text-right pr-3 select-none opacity-60",
                       line.type === 'added' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    )}
                  >
                     {line.type !== 'removed' ? line.currentLineNum : ' '}
                  </span>
                  <span
                    className={cn(
                      "pl-2 flex-1 whitespace-pre-wrap break-all",
                      line.type === 'added' && 'text-green-700 dark:text-green-300',
                      line.type === 'removed' && 'text-red-700 dark:text-red-300'
                    )}
                  >
                    <span className={cn("mr-1 font-bold",
                        line.type === 'added' ? 'text-green-600 dark:text-green-400' :
                        line.type === 'removed' ? 'text-red-600 dark:text-red-400' : ''
                    )}>
                        {line.type === 'added' && '+'}
                        {line.type === 'removed' && '-'}
                        {line.type === 'common' && ' '}
                    </span>
                    {line.type === 'added' ? line.currentLine : line.originalLine}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default CodeDiffViewer;