"use client"

import { useEffect, useRef, useState } from "react"
import type { CodeFile } from "@/types/file"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { Globe, Smartphone, Tablet, Monitor, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface PreviewPanelProps {
  activeFile: CodeFile | null
}

export default function PreviewPanel({ activeFile }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [viewportSize, setViewportSize] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [isLoading, setIsLoading] = useState(false)
  const isMobile = useIsMobile()

  // Auto-adjust viewport for mobile devices
  useEffect(() => {
    if (isMobile && viewportSize === "desktop") {
      setViewportSize("mobile")
    }
  }, [isMobile, viewportSize])

  const getPreviewContent = () => {
    if (!activeFile) {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f8fafc;
              color: #334155;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .container {
              text-align: center;
              max-width: 90%;
              padding: 20px;
            }
            .icon {
              width: 48px;
              height: 48px;
              margin: 0 auto 16px;
              opacity: 0.5;
            }
            @media (min-width: 640px) {
              .icon {
                width: 64px;
                height: 64px;
                margin-bottom: 24px;
              }
            }
            h1 {
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 8px;
              color: #1e293b;
            }
            @media (min-width: 640px) {
              h1 {
                font-size: 24px;
                margin-bottom: 12px;
              }
            }
            p {
              font-size: 14px;
              line-height: 1.6;
              opacity: 0.8;
            }
            @media (min-width: 640px) {
              p {
                font-size: 16px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            <h1>No File Selected</h1>
            <p>Select an HTML file from the explorer to see a live preview here.</p>
          </div>
        </body>
        </html>
      `
    }

    if (activeFile.language === "html") {
      // Add responsive meta tag if not present
      let content = activeFile.content
      if (!content.includes('viewport')) {
        content = content.replace(
          '<head>',
          '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
        )
      }
      return content
    }

    if (activeFile.language === "javascript" || activeFile.language === "typescript") {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>JavaScript Preview</title>
          <style>
            body {
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              margin: 0;
              padding: 12px;
              background: #1e1e1e;
              color: #d4d4d4;
              font-size: 12px;
            }
            @media (min-width: 640px) {
              body {
                padding: 20px;
                font-size: 14px;
              }
            }
            .console {
              background: #252526;
              border: 1px solid #3e3e42;
              border-radius: 4px;
              padding: 12px;
              line-height: 1.5;
            }
            @media (min-width: 640px) {
              .console {
                padding: 16px;
              }
            }
            .output {
              margin-top: 12px;
              padding: 8px;
              background: #0d1117;
              border-radius: 4px;
              border-left: 3px solid #58a6ff;
            }
            @media (min-width: 640px) {
              .output {
                margin-top: 16px;
                padding: 12px;
              }
            }
            pre {
              white-space: pre-wrap;
              word-break: break-word;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="console">
            <h3>JavaScript Code:</h3>
            <pre><code>${activeFile.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            <div class="output" id="output">
              <strong>Output:</strong>
              <div id="result"></div>
            </div>
          </div>
          <script>
            try {
              const originalLog = console.log;
              const output = [];
              console.log = function(...args) {
                output.push(args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' '));
                originalLog.apply(console, args);
              };
              
              ${activeFile.content}
              
              document.getElementById('result').innerHTML = output.length > 0 
                ? output.map(line => '<div>' + line + '</div>').join('') 
                : '<em>No console output</em>';
            } catch (error) {
              document.getElementById('result').innerHTML = '<div style="color: #ff6b6b;">Error: ' + error.message + '</div>';
            }
          </script>
        </body>
        </html>
      `
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>File Preview</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 12px;
            background: #f8fafc;
            color: #334155;
          }
          @media (min-width: 640px) {
            body {
              padding: 20px;
            }
          }
          .container {
            max-width: 100%;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          @media (min-width: 640px) {
            .container {
              max-width: 800px;
              padding: 24px;
            }
          }
          .file-info {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          @media (min-width: 640px) {
            .file-info {
              margin-bottom: 20px;
              padding-bottom: 16px;
            }
          }
          .file-icon {
            width: 20px;
            height: 20px;
            margin-right: 8px;
            opacity: 0.6;
            flex-shrink: 0;
          }
          @media (min-width: 640px) {
            .file-icon {
              width: 24px;
              height: 24px;
              margin-right: 12px;
            }
          }
          h2 {
            margin: 0;
            font-size: 16px;
            word-break: break-word;
          }
          @media (min-width: 640px) {
            h2 {
              font-size: 18px;
            }
          }
          .file-type {
            margin: 2px 0 0;
            font-size: 12px;
            opacity: 0.7;
          }
          @media (min-width: 640px) {
            .file-type {
              margin: 4px 0 0;
              font-size: 14px;
            }
          }
          pre {
            background: #f1f5f9;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 12px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
          }
          @media (min-width: 640px) {
            pre {
              padding: 16px;
              font-size: 14px;
              white-space: pre;
              word-break: normal;
            }
          }
          code {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="file-info">
            <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            <div>
              <h2>${activeFile.name}</h2>
              <p class="file-type">${activeFile.language} file</p>
            </div>
          </div>
          <pre><code>${activeFile.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        </div>
      </body>
      </html>
    `
  }

  useEffect(() => {
    if (iframeRef.current) {
      setIsLoading(true)
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      
      if (doc) {
        doc.open()
        doc.write(getPreviewContent())
        doc.close()
        
        iframe.onload = () => {
          setIsLoading(false)
        }
      }
    }
  }, [activeFile])

  const getViewportStyles = () => {
    switch (viewportSize) {
      case "mobile":
        return { 
          width: isMobile ? "100%" : "375px", 
          height: isMobile ? "100%" : "667px" 
        }
      case "tablet":
        return { 
          width: isMobile ? "100%" : "768px", 
          height: isMobile ? "100%" : "1024px" 
        }
      default:
        return { width: "100%", height: "100%" }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Viewport Controls - Responsive */}
      <div className="h-8 sm:h-10 border-b border-border flex items-center justify-between px-2 sm:px-4 bg-muted/10">
        <div className="flex items-center space-x-1">
          <Button
            variant={viewportSize === "desktop" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewportSize("desktop")}
            className="h-6 sm:h-7 px-2 sm:px-3 text-xs"
          >
            <Monitor className="h-3 w-3 mr-1" />
            <span className="hidden xs:inline">Desktop</span>
          </Button>
          <Button
            variant={viewportSize === "tablet" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewportSize("tablet")}
            className="h-6 sm:h-7 px-2 sm:px-3 text-xs"
          >
            <Tablet className="h-3 w-3 mr-1" />
            <span className="hidden xs:inline">Tablet</span>
          </Button>
          <Button
            variant={viewportSize === "mobile" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewportSize("mobile")}
            className="h-6 sm:h-7 px-2 sm:px-3 text-xs"
          >
            <Smartphone className="h-3 w-3 mr-1" />
            <span className="hidden xs:inline">Mobile</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
          {viewportSize !== "desktop" && !isMobile && (
            <span className="hidden sm:inline">
              {getViewportStyles().width} × {getViewportStyles().height}
            </span>
          )}
          {isLoading && (
            <div className="flex items-center space-x-1">
              <RotateCcw className="h-3 w-3 animate-spin" />
              <span className="hidden sm:inline">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Container - Responsive */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-gray-100 dark:bg-gray-900">
        <div 
          className={cn(
            "bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300",
            isMobile ? "w-full h-full" : ""
          )}
          style={isMobile ? { width: "100%", height: "100%" } : 
                 viewportSize === "desktop" ? { width: "100%", height: "100%" } : 
                 getViewportStyles()}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}