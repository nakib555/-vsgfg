// components/terminal.tsx
"use client"

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, X, ChevronRight, Loader2, Play, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, ScrollArea, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { getPowerShellInstance, removePowerShellInstance, PowerShellOutput } from "@/lib/powershell-service";
import { toast } from "sonner";

// Ensure terminal.css is imported in a global CSS file or directly here if scoped CSS is used.
// For this example, assuming it's in app/globals.css or similar and applies globally.
// import "@/styles/terminal.css"; 

interface TerminalCommand {
  command: string
  output: string
  isError?: boolean
}

interface TerminalProps {
  theme?: string
}

export default function Terminal({ theme = "dark" }: TerminalProps) {
  const [activeTabId, setActiveTabId] = useState("terminal-1")
  const [tabs, setTabs] = useState([{ id: "terminal-1", name: "PowerShell 1" }])
  const [commandHistory, setCommandHistory] = useState<Record<string, TerminalCommand[]>>({
    "terminal-1": [],
  })
  const [inputValue, setInputValue] = useState("")
  const [currentPath, setCurrentPath] = useState("~/project_files")

  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const addTab = () => {
    const newId = `terminal-${tabs.length + 1}`
    setTabs([...tabs, { id: newId, name: `PowerShell ${tabs.length + 1}` }])
    setCommandHistory({
      ...commandHistory,
      [newId]: [],
    })
    setActiveTabId(newId)
  }

  const removeTab = (id: string) => {
    if (tabs.length === 1) return

    const newTabs = tabs.filter((tab) => tab.id !== id)
    setTabs(newTabs)

    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id)
    }
  }

  const executeCommand = (command: string) => {
    if (!command.trim()) return

    let output = ""
    let isError = false

    // Simple command simulation
    if (command === "clear" || command === "cls") {
      setCommandHistory({
        ...commandHistory,
        [activeTabId]: [],
      })
      return
    } else if (command.startsWith("cd ")) {
      const dir = command.substring(3).trim()
      if (dir === ".." || dir === "../") {
        const parts = currentPath.split("/")
        parts.pop()
        setCurrentPath(parts.join("/") || "~")
      } else if (dir.startsWith("/")) {
        setCurrentPath(`~${dir}`)
      } else {
        setCurrentPath(`${currentPath}/${dir}`)
      }
      output = ""
    } else if (command === "ls" || command === "dir") {
      output = "file1.txt\nfile2.js\nfolder1/\n"
    } else if (command === "pwd") {
      output = currentPath
    } else if (command === "echo hello") {
      output = "hello"
    } else if (command === "help") {
      output = "Available commands: clear, cd, ls, dir, pwd, echo, help"
    } else {
      output = `Command not found: ${command}`
      isError = true
    }

    // Safely escape the command and format the output
    const safeCommand = escapeHtml(command)
    const formattedOutput = formatTerminalOutput(output)

    const newHistory = [
      ...commandHistory[activeTabId],
      {
        command: safeCommand,
        output: formattedOutput,
        isError,
      },
    ]

    setCommandHistory({
      ...commandHistory,
      [activeTabId]: newHistory,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputValue)
      setInputValue("")
    }
  }

  // Focus input when tab changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeTabId])

  // Scroll to bottom when history changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [commandHistory, activeTabId])

  const terminalThemeClass = cn(
    "h-[calc(100%-32px)] font-mono text-sm overflow-auto p-2",
    theme === "dark"
      ? "bg-background text-foreground"
      : theme === "light"
        ? "bg-background text-foreground"
        : theme === "ubuntu"
          ? "bg-[#300a24] text-[#ffffff]"
          : theme === "powershell"
            ? "bg-[#012456] text-[#ffffff]"
            : theme === "cmd"
              ? "bg-black text-white"
              : theme === "matrix"
                ? "bg-black text-green-500"
                : "bg-background text-foreground",
  )

  return (
    <div className="h-full flex flex-col">
      <div className="h-8 border-b border-border flex items-center px-2 bg-muted/30">
        <div className="flex-1 flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center h-7 px-3 border-r border-border text-xs whitespace-nowrap cursor-pointer
                ${activeTabId === tab.id ? "bg-background" : "hover:bg-background/50"}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  className="ml-2 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTab(tab.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button className="h-7 w-7 flex items-center justify-center hover:bg-background/50" onClick={addTab}>
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div ref={contentRef} className={terminalThemeClass}>
        {commandHistory[activeTabId]?.map((item, index) => (
          <div key={index}>
            <div className="flex items-center">
              <span className="text-blue-500 mr-1">{currentPath}&gt;</span>
              <span dangerouslySetInnerHTML={{ __html: item.command }} />
            </div>
            {item.output && (
              <div className={item.isError ? "ps-error" : "ps-success"}>
                {item.output.split("\n").map((line, i) => (
                  <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center">
          <span className="text-blue-500 mr-1">{currentPath}&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}