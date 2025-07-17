"use client"

import { useEffect, useRef, useState } from "react"
import type { CodeFile } from "@/types/file"
import { Button } from "@/components/ui/button"
import { Globe, Smartphone, Tablet, Monitor, RotateCcw } from "lucide-react"

interface PreviewPanelProps {
  activeFile: CodeFile | null
}

export default function PreviewPanel({ activeFile }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [viewportSize, setViewportSize] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [isLoading, setIsLoading] = useState(false)

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
              padding: 40px;
              background: #f8fafc;
              color: #334155;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .container {
              text-align: center;
              max-width: 500px;
            }
            .icon {
              width: 64px;
              height: 64px;
              margin: 0 auto 24px;
              opacity: 0.5;
            }
            h1 {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 12px;
              color: #1e293b;
            }
            p {
              font-size: 16px;
              line-height: 1.6;
              opacity: 0.8;
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
      return activeFile.content
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
              padding: 20px;
              background: #1e1e1e;
              color: #d4d4d4;
            }
            .console {
              background: #252526;
              border: 1px solid #3e3e42;
              border-radius: 4px;
              padding: 16px;
              font-size: 14px;
              line-height: 1.5;
            }
            .output {
              margin-top: 16px;
              padding: 12px;
              background: #0d1117;
              border-radius: 4px;
              border-left: 3px solid #58a6ff;
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
            padding: 20px;
            background: #f8fafc;
            color: #334155;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .file-info {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
          }
          .file-icon {
            width: 24px;
            height: 24px;
            margin-right: 12px;
            opacity: 0.6;
          }
          pre {
            background: #f1f5f9;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 14px;
            line-height: 1.5;
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
              <h2 style="margin: 0; font-size: 18px;">${activeFile.name}</h2>
              <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.7;">${activeFile.language} file</p>
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
        return { width: "375px", height: "667px" }
      case "tablet":
        return { width: "768px", height: "1024px" }
      default:
        return { width: "100%", height: "100%" }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Viewport Controls */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-muted/10">
        <div className="flex items-center space-x-1">
          <Button
            variant={viewportSize === "desktop" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewportSize("desktop")}
            className="h-7"
          >
            <Monitor className="h-3 w-3 mr-1" />
            Desktop
          </Button>
          <Button
            variant={viewportSize === "tablet" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewportSize("tablet")}
            className="h-7"
          >
            <Tablet className="h-3 w-3 mr-1" />
            Tablet
          </Button>
          <Button
            variant={viewportSize === "mobile" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewportSize("mobile")}
            className="h-7"
          >
            <Smartphone className="h-3 w-3 mr-1" />
            Mobile
          </Button>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          {viewportSize !== "desktop" && (
            <span>{getViewportStyles().width} × {getViewportStyles().height}</span>
          )}
          {isLoading && (
            <div className="flex items-center space-x-1">
              <RotateCcw className="h-3 w-3 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300"
          style={viewportSize === "desktop" ? { width: "100%", height: "100%" } : getViewportStyles()}
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