"use client"

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface TypingMarkdownProps {
  content: string;
  typingSpeed?: number; // milliseconds per character
  className?: string;
  enableCopy?: boolean; // Enable copy button on code blocks
  skipAnimation?: boolean; // Option to skip typing animation
  theme?: 'light' | 'dark' | 'system'; // Theme override
  codeBlockTheme?: 'vscode-dark' | 'github-dark' | 'dracula'; // Code block theme
  proseSize?: 'sm' | 'base' | 'lg'; // Control overall text size
  syntaxHighlightEnabled?: boolean; // Toggle syntax highlighting
}

export function TypingMarkdown({
  content,
  typingSpeed = 20,
  className,
  enableCopy = true,
  skipAnimation = false,
  theme = 'system',
  codeBlockTheme = 'vscode-dark',
  proseSize = 'base',
  syntaxHighlightEnabled = true,
}: TypingMarkdownProps) {
  const [displayedContent, setDisplayedContent] = useState(skipAnimation ? content : '');
  const [isTyping, setIsTyping] = useState(!skipAnimation);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  // Handle theme
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let currentLength = 0;
    setIsTyping(true);

    const typeText = () => {
      if (currentLength <= content.length) {
        setDisplayedContent(content.slice(0, currentLength));
        currentLength++;

        if (currentLength <= content.length) {
          setTimeout(typeText, typingSpeed);
        } else {
          setIsTyping(false);
        }
      }
    };

    typeText();

    return () => {
      currentLength = content.length + 1; // Stop typing on unmount
    };
  }, [content, typingSpeed]);

  return (
    <div className={cn('prose dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-md !bg-zinc-900 !p-4"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={cn("rounded-md bg-zinc-200 px-1.5 py-0.5 font-mono text-sm dark:bg-zinc-800", className)} {...props}>
                {children}
              </code>
            );
          },
          // Add table styling
          table: ({ children }) => (
            <div className="my-6 w-full overflow-y-auto rounded-lg border dark:border-zinc-800">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="divide-x divide-zinc-200 dark:divide-zinc-800">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="p-4 text-left font-medium text-zinc-700 dark:text-zinc-300">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-4 text-zinc-700 dark:text-zinc-300">
              {children}
            </td>
          ),
          // Add blockquote styling
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-4 border-zinc-300 pl-6 italic text-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
              {children}
            </blockquote>
          ),
          // Add list styling
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-6 marker:text-zinc-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-2 pl-6 marker:text-zinc-500">
              {children}
            </ol>
          ),
          // Add heading styling
          h1: ({ children }) => (
            <h1 className="mt-8 mb-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 mb-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {children}
            </h3>
          ),
          // Add link styling
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 underline decoration-blue-600/30 underline-offset-2 transition-colors hover:text-blue-800 hover:decoration-blue-800/30 dark:text-blue-400 dark:decoration-blue-400/30 dark:hover:text-blue-200 dark:hover:decoration-blue-200/30"
            >
              {children}
            </a>
          ),
          // Add horizontal rule styling
          hr: () => (
            <hr className="my-8 border-zinc-200 dark:border-zinc-800" />
          ),
        }}
      >
        {displayedContent}
      </ReactMarkdown>
      {isTyping && (
        <span className="inline-block h-4 w-2 animate-blink bg-current" />
      )}
    </div>
  );
}

export default TypingMarkdown;
