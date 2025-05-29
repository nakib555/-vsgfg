// --- File: components/terminal.tsx ---
"use client"
import React from "react";
import type { HTMLAttributes } from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Plus, X, Shell, Loader2, AlertCircle } from "lucide-react"
import { formatTerminalOutput } from "@/lib/html-utils"
import { cn } from "@/lib/utils"
import { PowerShellService, getPowerShellInstance, removePowerShellInstance, type PowerShellOutput } from "@/lib/powershell-service"
import '@/styles/terminal.css'

interface TerminalCommand {
  command: string
  output: string
  isError?: boolean
}

interface TerminalProps extends HTMLAttributes<HTMLDivElement> {
  theme?: string
  workingDirectory?: string
  isInputDisabledBySetting?: boolean;
}

export interface TerminalRef {
  executeExternalCommand: (command: string) => Promise<{ success: boolean; output: string }>;
}


interface TabCompletionState {
  completions: string[];
  selectedIndex: number;
  originalInput: string;
}

const Terminal = React.forwardRef<TerminalRef, TerminalProps>(({ theme = "dark", workingDirectory, isInputDisabledBySetting = false, className, ...props }, ref) => {
  const [activeTabId, setActiveTabId] = useState("terminal-1")
  const [tabs, setTabs] = useState([{ id: "terminal-1", name: "PowerShell 1", type: "powershell" as const }])
  const [commandHistory, setCommandHistory] = useState<Record<string, TerminalCommand[]>>({
    "terminal-1": [],
  })
  const [inputValue, setInputValue] = useState<string>("")
  const [currentPath, setCurrentPath] = useState(workingDirectory || "~")
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [commandStack, setCommandStack] = useState<Record<string, string[]>>({
    "terminal-1": [],
  })
  const [completions, setCompletions] = useState<TabCompletionState>({
    completions: [],
    selectedIndex: 0,
    originalInput: "",
  });
  const [isExecuting, setIsExecuting] = useState<Record<string, boolean>>({ "terminal-1": true });

  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // console.log(`[Terminal ${activeTabId}] Component RENDER. Current Path: ${currentPath}, Input: "${inputValue}", Executing: ${isExecuting[activeTabId]}, InputDisabledBySetting: ${isInputDisabledBySetting}`);


  React.useImperativeHandle(ref, () => ({
    executeExternalCommand: async (command: string) => {
      // console.log(`[Terminal ${activeTabId}] executeExternalCommand CALLED with command: "${command}"`);
      if (isInputDisabledBySetting) {
        console.warn(`[Terminal ${activeTabId}] executeExternalCommand: Input is disabled by user setting. Command "${command}" not executed.`);
        const disabledMsg = "Terminal input is currently disabled by user setting. Command not executed.";
        setCommandHistory(prev => ({
            ...prev,
            [activeTabId]: [
              ...(prev[activeTabId] || []),
              { command: `(Blocked External) ${command}`, output: formatTerminalOutput(disabledMsg), isError: true }
            ]
          }));
        return { success: false, output: disabledMsg };
      }
      if (!activeTabId) {
        console.error(`[Terminal ${activeTabId}] executeExternalCommand: No active terminal tab.`);
        return { success: false, output: "No active terminal tab." };
      }
      // console.log(`[Terminal ${activeTabId}] Executing external command: ${command}`);
      setIsExecuting(prev => ({ ...prev, [activeTabId]: true }));

      setCommandHistory(prev => ({
        ...prev,
        [activeTabId]: [
          ...(prev[activeTabId] || []),
          { command: command, output: '[Executing external command...]', isError: false }
        ]
      }));

      const pwsh = getPowerShellInstance(activeTabId);
      try {
        const result = await pwsh.executeCommand(command);
        // console.log(`[Terminal ${activeTabId}] executeExternalCommand: Result from PowerShellService:`, result);
        return { success: !result.isError, output: result.data };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error executing external command";
        console.error(`[Terminal ${activeTabId}] executeExternalCommand: Error:`, errorMsg);
        setCommandHistory(prev => {
            const currentTabHistory = prev[activeTabId] || [];
            const lastEntryIndex = currentTabHistory.length -1;
            if(lastEntryIndex >=0 && currentTabHistory[lastEntryIndex].command === command) {
                const updatedHistory = [...currentTabHistory];
                updatedHistory[lastEntryIndex] = {...updatedHistory[lastEntryIndex], output: formatTerminalOutput(errorMsg), isError: true};
                return {...prev, [activeTabId]: updatedHistory};
            }
            return prev;
        });
        setIsExecuting(prev => ({ ...prev, [activeTabId]: false }));
        return { success: false, output: errorMsg };
      }
    }
  }));

  const currentTabIsExecuting = !!isExecuting[activeTabId];
  // isInputEffectivelyDisabledForExecution is used to gate actual command sending
  const isInputEffectivelyDisabledForExecution = currentTabIsExecuting || isInputDisabledBySetting;
  // shouldFocusInput determines if the input field itself should try to grab focus
  const shouldFocusInput = activeTabId && inputRef.current && !currentTabIsExecuting;


  useEffect(() => {
    // console.log(`[Terminal ${activeTabId}] MOUNT/UPDATE useEffect for [activeTabId, workingDirectory]. Initializing. Setting isExecuting = true. Current workingDirectory prop: ${workingDirectory}`);
    setIsExecuting(prev => ({ ...prev, [activeTabId]: true }));

    const pwsh = getPowerShellInstance(activeTabId, workingDirectory);
    // console.log(`[Terminal ${activeTabId}] Got PowerShell instance. Initial CWD for instance: ${pwsh.initialWorkingDir}`);


    const handleOutput = (output: PowerShellOutput) => {
      // console.log(`[Terminal ${activeTabId}] EVENT 'output' received. Path: "${output.currentPath}", Error: ${output.isError}, Data: "${output.data.substring(0,50)}...". Setting isExecuting = false.`);
      if (!pwsh.isInitialized && !output.isError) {
        // console.log(`%c[Terminal ${activeTabId}] Calling pwsh.setAsInitialized from handleOutput. Path: ${output.currentPath}`, 'color: blue; font-weight: bold;');
        pwsh.setAsInitialized(output.currentPath);
      }

      setCommandHistory(prev => {
        const tabHistory = prev[activeTabId] || [];
        if (tabHistory.length > 0) {
          const lastCommandIndex = tabHistory.length - 1;
          // const lastCommand = tabHistory[lastCommandIndex]; // Not strictly needed here

          const updatedHistory = [...tabHistory];
          updatedHistory[lastCommandIndex] = {
            ...updatedHistory[lastCommandIndex], // Preserve the original command
            output: formatTerminalOutput(output.data),
            isError: output.isError
          };
          return { ...prev, [activeTabId]: updatedHistory };
        }
        // This case might happen if initial prompt output comes before any user command
        return { ...prev, [activeTabId]: [...tabHistory, { command: "[System Info]", output: formatTerminalOutput(output.data), isError: output.isError }] };
      });
      setCurrentPath(output.currentPath);
      setIsExecuting(prev => ({ ...prev, [activeTabId]: false }));
    };

    const handleInitialPath = ({ currentPath: pathValue }: { currentPath: string }) => {
      // console.log(`[Terminal ${activeTabId}] EVENT 'initialPath' received. Path: "${pathValue}". Setting isExecuting = false.`);
      // console.log(`%c[Terminal ${activeTabId}] Calling pwsh.setAsInitialized from handleInitialPath. Path: ${pathValue}`, 'color: blue; font-weight: bold;');
      pwsh.setAsInitialized(pathValue);
      setCurrentPath(pathValue);
      setCommandHistory(prev => ({
        ...prev,
        [activeTabId]: [...(prev[activeTabId] || []), { command: "[Session Ready]", output: `Working directory: ${pathValue}`, isError: false }]
      }));
      setIsExecuting(prev => ({ ...prev, [activeTabId]: false }));
    };

    const handleClose = () => {
      // console.log(`[Terminal ${activeTabId}] EVENT 'close' received. Setting isExecuting = false.`);
      setCommandHistory(prev => ({
        ...prev,
        [activeTabId]: [...(prev[activeTabId] || []), { command: "", output: formatTerminalOutput("[Session Closed]"), isError: true }]
      }));
      setIsExecuting(prev => ({ ...prev, [activeTabId]: false }));
    };

    pwsh.on('output', handleOutput);
    pwsh.on('initialPath', handleInitialPath);
    pwsh.on('close', handleClose);

    // console.log(`[Terminal ${activeTabId}] Calling pwsh.initializeSessionIfNotInitialized().`);
    pwsh.initializeSessionIfNotInitialized()
      .then(() => {
        // console.log(`[Terminal ${activeTabId}] initializeSessionIfNotInitialized promise RESOLVED.`);
      })
      .catch(err => {
          console.error(`[Terminal ${activeTabId}] Error from initializeSessionIfNotInitialized promise:`, err);
          setIsExecuting(prev => ({ ...prev, [activeTabId]: false }));
          setCommandHistory(prev => ({
            ...prev,
            [activeTabId]: [...(prev[activeTabId] || []), { command: "[Session Error]", output: formatTerminalOutput(`Initialization failed: ${(err as Error).message}`), isError: true }]
          }));
      });

    return () => {
      // console.log(`[Terminal ${activeTabId}] CLEANUP useEffect for [activeTabId, workingDirectory]. Removing listeners.`);
      pwsh.off('output', handleOutput);
      pwsh.off('initialPath', handleInitialPath);
      pwsh.off('close', handleClose);
    };
  }, [activeTabId, workingDirectory]); // Added workingDirectory as it's used in getPowerShellInstance

  const addTab = () => {
    const newId = `terminal-${Date.now()}`
    // console.log(`[Terminal] Adding new tab ${newId}`);
    setTabs([...tabs, { id: newId, name: `PowerShell ${tabs.length + 1}`, type: "powershell" as const }])
    setCommandHistory(prev => ({ ...prev, [newId]: [] }))
    setCommandStack(prev => ({ ...prev, [newId]: [] }))
    setIsExecuting(prev => ({ ...prev, [newId]: true }));
    setActiveTabId(newId)
  }

  const removeTab = (id: string) => {
    if (tabs.length === 1) return
    // console.log(`[Terminal] Removing tab ${id}`);
    removePowerShellInstance(id)
    const newTabs = tabs.filter((tab) => tab.id !== id)
    setTabs(newTabs)

    const newIsExecuting = { ...isExecuting };
    delete newIsExecuting[id];
    setIsExecuting(newIsExecuting);

    if (activeTabId === id) {
      const newActiveTabId = newTabs[0]?.id || "";
      // console.log(`[Terminal] Active tab was removed, switching to ${newActiveTabId}`);
      setActiveTabId(newActiveTabId);
    }
    setCommandHistory(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
    setCommandStack(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
  }

  const executeUserCommand = async (command: string) => {
    // console.log(`[Terminal ${activeTabId}] executeUserCommand CALLED with command: "${command}"`);
    if (isInputDisabledBySetting) {
        console.warn(`[Terminal ${activeTabId}] executeUserCommand: Input is disabled by user setting. Command "${command}" NOT EXECUTED.`);
        setCommandHistory(prev => ({
            ...prev,
            [activeTabId]: [
              ...(prev[activeTabId] || []),
              { command: command, output: formatTerminalOutput("Terminal input is currently disabled by user setting. Command not executed."), isError: true }
            ]
          }));
        setInputValue("");
        return;
    }
    if (!command.trim() || currentTabIsExecuting) {
      // console.log(`[Terminal ${activeTabId}] executeUserCommand: Command empty or already executing. Input: "${command}", Executing: ${currentTabIsExecuting}`);
      return;
    }
    // console.log(`[Terminal ${activeTabId}] executeUserCommand: Processing "${command}". Setting isExecuting = true.`);
    setIsExecuting(prev => ({ ...prev, [activeTabId]: true }));

    const currentStack = commandStack[activeTabId] || [];
    setCommandStack(prev => ({ ...prev, [activeTabId]: [...currentStack, command] }));
    setHistoryIndex(-1);

    setCommandHistory(prev => ({
      ...prev,
      [activeTabId]: [
        ...(prev[activeTabId] || []),
        { command: command, output: '', isError: false } // Output will be filled by the event handler
      ]
    }));

    setInputValue("");
    setCompletions({ completions: [], selectedIndex: 0, originalInput: "" });

    if (command.toLowerCase() === "clear" || command.toLowerCase() === "cls") {
      // console.log(`[Terminal ${activeTabId}] executeUserCommand: Clearing history.`);
      setCommandHistory(prev => ({ ...prev, [activeTabId]: [] }));
      const pwsh = getPowerShellInstance(activeTabId);
      await pwsh.executeCommand("Write-Host -NoNewline ''"); // To get prompt back
      // console.log(`[Terminal ${activeTabId}] executeUserCommand: Clear command finished.`);
      return;
    }

    const pwsh = getPowerShellInstance(activeTabId);
    // console.log(`[Terminal ${activeTabId}] executeUserCommand: Sending command "${command}" to PowerShellService.`);
    await pwsh.executeCommand(command);
    // console.log(`[Terminal ${activeTabId}] executeUserCommand: Command "${command}" sent. Waiting for output event.`);
  }

  const handleTabCompletion = async () => {
    // console.log(`[Terminal ${activeTabId}] handleTabCompletion CALLED. Input: "${inputValue}"`);
    if (isInputDisabledBySetting) {
        // console.log(`[Terminal ${activeTabId}] handleTabCompletion: Input disabled by setting. Aborting.`);
        return;
    }
    if (!inputValue.trim() || currentTabIsExecuting) {
      // console.log(`[Terminal ${activeTabId}] handleTabCompletion: Input empty or executing. Aborting.`);
      return;
    }
    const pwsh = getPowerShellInstance(activeTabId);

    let currentCompletions = completions.completions;
    let currentSelectedIndex = completions.selectedIndex;
    let currentOriginalInput = completions.originalInput;

    if (currentCompletions.length === 0 || inputValue !== currentCompletions[currentSelectedIndex]) {
      // console.log(`[Terminal ${activeTabId}] Tab completion: Fetching new. Input: "${inputValue}"`);
      setIsExecuting(prev => ({ ...prev, [activeTabId]: true }));
      const result = await pwsh.getTabCompletions(inputValue, inputValue.length);
      setIsExecuting(prev => ({ ...prev, [activeTabId]: false }));
      // console.log(`[Terminal ${activeTabId}] Tab completion: Received completions:`, result.completions);
      if (result.completions.length > 0) {
        currentCompletions = result.completions;
        currentSelectedIndex = 0;
        currentOriginalInput = inputValue;
        setInputValue(result.completions[0]);
      } else {
        currentCompletions = [];
        currentSelectedIndex = 0;
        currentOriginalInput = "";
      }
    } else {
      currentSelectedIndex = (currentSelectedIndex + 1) % currentCompletions.length;
      setInputValue(currentCompletions[currentSelectedIndex]);
      // console.log(`[Terminal ${activeTabId}] Tab completion: Cycling. New selection: "${currentCompletions[currentSelectedIndex]}"`);
    }

    setCompletions({
      completions: currentCompletions,
      selectedIndex: currentSelectedIndex,
      originalInput: currentOriginalInput,
    });
  };


  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // console.log(`[Terminal ${activeTabId}] handleKeyDown: Key="${e.key}", Ctrl=${e.ctrlKey}, currentTabIsExecuting=${currentTabIsExecuting}, isInputDisabledBySetting=${isInputDisabledBySetting}`);
    if (currentTabIsExecuting && e.key !== 'Escape' && !(e.ctrlKey && e.key.toLowerCase() === 'c')) {
      if (e.key === 'Enter') e.preventDefault();
      // console.log(`[Terminal ${activeTabId}] handleKeyDown: Input actions (except Ctrl+C/Esc) blocked, command executing.`);
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'c' && currentTabIsExecuting) {
        // console.log(`[Terminal ${activeTabId}] Ctrl+C pressed while executing. Attempting to stop current command.`);
        const pwsh = getPowerShellInstance(activeTabId);
        pwsh.emit('output', { data: "\n[Command Interrupted by User]", currentPath, isError: true });
        setInputValue("");
        return;
    }


    const currentCmdStack = commandStack[activeTabId] || [];

    if (e.key === 'Enter') {
      e.preventDefault();
      // console.log(`[Terminal ${activeTabId}] handleKeyDown: Enter pressed. Current input: "${inputValue}"`);
      await executeUserCommand(inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isInputDisabledBySetting) return;
      if (currentCmdStack.length > 0 && historyIndex < currentCmdStack.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const newCmd = currentCmdStack[currentCmdStack.length - 1 - newIndex] || '';
        setInputValue(newCmd);
        // console.log(`[Terminal ${activeTabId}] handleKeyDown: ArrowUp. History index: ${newIndex}, Command: "${newCmd}"`);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isInputDisabledBySetting) return;
      if (historyIndex > -1) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const newCmd = newIndex === -1 ? '' : (currentCmdStack[currentCmdStack.length - 1 - newIndex] || '');
        setInputValue(newCmd);
        // console.log(`[Terminal ${activeTabId}] handleKeyDown: ArrowDown. History index: ${newIndex}, Command: "${newCmd}"`);
      } else if (historyIndex === -1) {
        setInputValue("");
        // console.log(`[Terminal ${activeTabId}] handleKeyDown: ArrowDown. Cleared input.`);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // console.log(`[Terminal ${activeTabId}] handleKeyDown: Tab pressed.`);
      await handleTabCompletion();
    } else if (e.key === 'Escape') {
      if (completions.completions.length > 0) {
        e.preventDefault();
        setInputValue(completions.originalInput);
        setCompletions({ completions: [], selectedIndex: 0, originalInput: "" });
        // console.log(`[Terminal ${activeTabId}] handleKeyDown: Escape pressed. Cleared completions, restored: "${completions.originalInput}"`);
      }
    } else {
      if (completions.completions.length > 0 && e.key.length === 1) {
        setCompletions({ completions: [], selectedIndex: 0, originalInput: "" });
        // console.log(`[Terminal ${activeTabId}] handleKeyDown: Other key pressed. Cleared completions.`);
      }
    }
  };

  useEffect(() => {
    if (shouldFocusInput) {
      // console.log(`[Terminal ${activeTabId}] useEffect for focus: Focusing input. currentTabIsExecuting=${currentTabIsExecuting}`);
      inputRef.current?.focus();
    } else {
      // console.log(`[Terminal ${activeTabId}] useEffect for focus: NOT focusing. currentTabIsExecuting=${currentTabIsExecuting}, inputRef.current=${!!inputRef.current}`);
    }
  }, [activeTabId, currentTabIsExecuting, shouldFocusInput]);

  useEffect(() => {
    if (contentRef.current) {
      // console.log(`[Terminal ${activeTabId}] useEffect for scroll: Scrolling to bottom.`);
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [commandHistory, activeTabId]);


  const terminalThemeClass = cn(
    "h-[calc(100%-32px)] font-mono text-sm overflow-auto p-2",
    theme === "dark" ? "bg-background text-foreground"
      : theme === "light" ? "bg-background text-foreground"
      : theme === "ubuntu" ? "bg-[#300a24] text-[#ffffff]"
      : theme === "powershell" ? "bg-[#012456] text-[#ffffff]"
      : theme === "cmd" ? "bg-black text-white"
      : theme === "matrix" ? "bg-black text-green-500"
      : "bg-background text-foreground"
  );

  return (
    <div className={cn("h-full flex flex-col", className)} {...props} onClick={() => { if (inputRef.current) inputRef.current.focus(); }}>
      <div className="h-8 border-b border-border flex items-center px-2 bg-muted/30">
        <div className="flex-1 flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                `flex items-center h-7 px-3 border-r border-border text-xs whitespace-nowrap cursor-pointer`,
                activeTabId === tab.id ? "bg-background text-foreground" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
              onClick={() => {
                if (activeTabId !== tab.id) {
                  // console.log(`[Terminal] Switching tab from ${activeTabId} to ${tab.id}`);
                  setActiveTabId(tab.id);
                }
              }}
              title={tab.name}
            >
              {tab.type === "powershell" && <Shell className="w-3.5 h-3.5 mr-1.5" />}
              <span className="truncate max-w-[120px]">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  className="ml-2 opacity-50 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
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

      <div ref={contentRef} className={cn(terminalThemeClass, "terminal-content flex-1")}>
        {(commandHistory[activeTabId] || []).map((item, index) => (
          <div key={`${activeTabId}-cmd-${index}`}>
            <div className="flex items-center">
              <span className="ps-prompt">
                <span className="ps-prompt-drive">PS</span>
                <span className="ps-prompt-path">{currentPath}</span>
                <span>&gt;</span>
              </span>
              <span className="ps-command ml-2" dangerouslySetInnerHTML={{ __html: formatTerminalOutput(item.command) }} />
            </div>
            {item.output && (
              <div className={cn("ps-output", item.isError ? "ps-error-output" : "")} dangerouslySetInnerHTML={{ __html: item.output }} />
            )}
          </div>
        ))}

        <div className="flex flex-col">
          <div className="flex items-center mt-1">
            <span className="ps-prompt">
              <span className="ps-prompt-drive">PS</span>
              <span className="ps-prompt-path">{currentPath}</span>
              <span>&gt;</span>
            </span>
            {currentTabIsExecuting && !inputValue && (commandHistory[activeTabId] || []).length > 0 && (commandHistory[activeTabId] || [])[commandHistory[activeTabId].length -1]?.output === '' && !isInputDisabledBySetting && (
                 <Loader2 className="h-4 w-4 animate-spin ml-2 text-muted-foreground" />
            )}
            {isInputDisabledBySetting && (
                <span className="ml-2 text-xs text-destructive flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1"/> Input disabled in settings.
                </span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (completions.completions.length > 0 && e.target.value !== completions.completions[completions.selectedIndex]) {
                  setCompletions({ completions: [], selectedIndex: 0, originalInput: "" });
                }
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                "flex-1 bg-transparent border-none outline-none ml-2 text-foreground ps-command",
                isInputDisabledBySetting && "opacity-70"
              )}
              autoFocus
              autoComplete="off"
              spellCheck="false"
              placeholder={isInputDisabledBySetting ? "Input disabled (execution blocked)" : ""}
            />
          </div>
          {completions.completions.length > 0 && !isInputDisabledBySetting && (
            <div className="ps-completion-list ml-8 mt-1 text-xs">
              {completions.completions.map((completion, index) => (
                <div
                  key={index}
                  className={cn(
                    "ps-completion-item px-2 py-0.5",
                    index === completions.selectedIndex && "bg-muted text-accent-foreground"
                  )}
                  onClick={() => {
                    setInputValue(completion);
                    setCompletions({ completions: [], selectedIndex: 0, originalInput: "" });
                    inputRef.current?.focus();
                  }}
                >
                  {completion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
});
Terminal.displayName = "Terminal";
export default Terminal;