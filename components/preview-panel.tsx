"use client"

import { useEffect, useRef, useState } from "react"
import type { CodeFile } from "@/types/file"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Maximize2, 
  Minus, 
  Plus,
  Smartphone,
  Tablet,
  Monitor,
  ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PreviewPanelProps {
  activeFile: CodeFile | null
}

const devicePresets = {
  "iPhone 16": { width: 393, height: 852, type: "mobile" },
  "iPhone 16 Plus": { width: 430, height: 932, type: "mobile" },
  "iPhone 16 Pro": { width: 402, height: 874, type: "mobile" },
  "iPhone 16 Pro Max": { width: 440, height: 956, type: "mobile" },
  "iPad": { width: 768, height: 1024, type: "tablet" },
  "iPad Pro": { width: 1024, height: 1366, type: "tablet" },
  "MacBook Air": { width: 1280, height: 832, type: "desktop" },
  "MacBook Pro": { width: 1440, height: 900, type: "desktop" },
  "Desktop": { width: 1920, height: 1080, type: "desktop" },
}

export default function PreviewPanel({ activeFile }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [selectedDevice, setSelectedDevice] = useState<string>("iPhone 16")
  const [zoom, setZoom] = useState(90)
  const [isLoading, setIsLoading] = useState(false)
  const isMobile = useIsMobile()

  const currentDevice = devicePresets[selectedDevice as keyof typeof devicePresets]

  const getPreviewContent = () => {
    if (!activeFile) {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AI Assistant</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: rgba(30, 58, 138, 0.9);
              border-radius: 16px;
              padding: 32px;
              max-width: 400px;
              width: 100%;
              text-align: center;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 24px;
              gap: 12px;
            }
            .icon {
              width: 32px;
              height: 32px;
              background: #3b82f6;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            h1 {
              font-size: 20px;
              font-weight: 600;
              margin: 0;
            }
            .tabs {
              display: flex;
              background: rgba(0, 0, 0, 0.2);
              border-radius: 8px;
              padding: 4px;
              margin-bottom: 24px;
            }
            .tab {
              flex: 1;
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 14px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .tab.active {
              background: rgba(255, 255, 255, 0.1);
            }
            .message {
              background: rgba(0, 0, 0, 0.2);
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 16px;
              text-align: left;
            }
            .message-header {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
              font-size: 12px;
              opacity: 0.8;
            }
            .message-content {
              font-size: 14px;
              line-height: 1.5;
            }
            .input-area {
              display: flex;
              gap: 8px;
              align-items: center;
            }
            .input {
              flex: 1;
              background: rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              padding: 12px;
              color: white;
              font-size: 14px;
            }
            .input::placeholder {
              color: rgba(255, 255, 255, 0.5);
            }
            .send-btn {
              background: #3b82f6;
              border: none;
              border-radius: 8px;
              padding: 12px 16px;
              color: white;
              cursor: pointer;
              font-size: 14px;
              transition: all 0.2s;
            }
            .send-btn:hover {
              background: #2563eb;
            }
            .error {
              background: rgba(239, 68, 68, 0.2);
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 8px;
              padding: 8px 12px;
              font-size: 12px;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">🤖</div>
              <h1>AI Assistant</h1>
            </div>
            
            <div class="tabs">
              <div class="tab active">💬 Chat</div>
              <div class="tab">⚙️ Settings</div>
            </div>
            
            <div class="message">
              <div class="message-header">
                🤖 AI Assistant • 11:26
              </div>
              <div class="message-content">
                Hello! I'm your AI coding assistant. Please set your Gemini API key in settings to begin.
              </div>
            </div>
            
            <div class="error">
              ❌ 1 Issue: Set API Key and select model in Settings to chat.
            </div>
            
            <div class="input-area">
              <input class="input" placeholder="Ask me anything about coding..." disabled>
              <button class="send-btn">Send</button>
            </div>
          </div>
        </body>
        </html>
      `
    }

    if (activeFile.language === "html") {
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
              padding: 20px;
              background: #1e1e1e;
              color: #d4d4d4;
              font-size: 14px;
            }
            .console {
              background: #252526;
              border: 1px solid #3e3e42;
              border-radius: 8px;
              padding: 16px;
              line-height: 1.5;
            }
            .output {
              margin-top: 16px;
              padding: 12px;
              background: #0d1117;
              border-radius: 6px;
              border-left: 3px solid #58a6ff;
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
            padding: 20px;
            background: #f8fafc;
            color: #334155;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
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
          h2 {
            margin: 0;
            font-size: 18px;
          }
          .file-type {
            margin: 4px 0 0;
            font-size: 14px;
            opacity: 0.7;
          }
          pre {
            background: #f1f5f9;
            padding: 16px;
            border-radius: 8px;
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

  const handleRefresh = () => {
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
  }

  const handleOpenExternal = () => {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(getPreviewContent())
      newWindow.document.close()
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText("http://localhost:3000")
    console.log("URL copied to clipboard")
  }

  const handleMaximize = () => {
    console.log("Maximizing preview...")
  }

  const adjustZoom = (delta: number) => {
    setZoom(prev => Math.max(25, Math.min(200, prev + delta)))
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Preview Header */}
      <div className="h-12 border-b border-gray-700 flex items-center justify-between px-4 bg-[#252526]">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-white" 
            onClick={handleRefresh}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          
          <div className="flex items-center space-x-2 px-3 py-1 bg-[#1e1e1e] border border-gray-600 rounded-md">
            <span className="text-green-400 text-sm">🔒</span>
            <span className="text-sm font-mono text-gray-300">localhost:3000</span>
            <span className="text-gray-500">/</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-white" 
            onClick={handleCopyUrl}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-white" 
            onClick={handleOpenExternal}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-white" 
            onClick={handleMaximize}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Device and Zoom Controls */}
      <div className="h-12 border-b border-gray-700 flex items-center justify-between px-4 bg-[#2d2d30]">
        <div className="flex items-center space-x-3">
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-40 h-8 bg-[#1e1e1e] border-gray-600 text-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1e1e1e] border-gray-600">
              {Object.entries(devicePresets).map(([name, device]) => (
                <SelectItem key={name} value={name} className="text-gray-300 focus:bg-gray-700">
                  <div className="flex items-center space-x-2">
                    {device.type === 'mobile' && <Smartphone className="h-4 w-4" />}
                    {device.type === 'tablet' && <Tablet className="h-4 w-4" />}
                    {device.type === 'desktop' && <Monitor className="h-4 w-4" />}
                    <span>{name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white"
            onClick={() => adjustZoom(-10)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-300 min-w-[50px] text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white"
            onClick={() => adjustZoom(10)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#1e1e1e]">
        <div 
          className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
          style={{
            width: isMobile ? '100%' : `${currentDevice.width}px`,
            height: isMobile ? '100%' : `${currentDevice.height}px`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center'
          }}
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