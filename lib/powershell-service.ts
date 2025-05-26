// lib/powershell-service.ts
import { EventEmitter } from 'events';

export interface PowerShellOutput {
  data: string;
  currentPath: string;
  isError?: boolean;
}

export interface TabCompletionResult {
  completions: string[];
  replacement: string;
}

export class PowerShellService extends EventEmitter {
  private sessionId: string;
  private initialWorkingDir: string | undefined;
  public isInitialized = false;
  private initializationPromise: Promise<void> | null = null; // To prevent multiple init attempts

  constructor(workingDir?: string) {
    super();
    this.initialWorkingDir = workingDir;
    this.sessionId = Math.random().toString(36).substring(7);
    console.log(`[PWSH Service ${this.sessionId}] Instance created. Initial CWD target: ${workingDir}`);
  }

  async initializeSessionIfNotInitialized(): Promise<void> {
    if (this.isInitialized) {
      console.log(`[PWSH Service ${this.sessionId}] Already initialized. Emitting current path.`);
      // If already initialized, we should still ensure the path is emitted for new listeners
      // by sending a benign command that will trigger an 'output' event.
      this.executeCommand("Write-Host -NoNewline ''"); // This will re-confirm path via 'output'
      return;
    }

    if (this.initializationPromise) {
      console.log(`[PWSH Service ${this.sessionId}] Initialization already in progress. Awaiting existing promise.`);
      return this.initializationPromise;
    }

    console.log(`[PWSH Service ${this.sessionId}] Starting initialization...`);
    this.initializationPromise = (async () => {
      try {
        // The primary goal of this first fetch is to trigger session creation on the backend
        // and let the backend's own initialization (processReady promise) take over.
        // We don't strictly need to check the content of *this* specific response for success,
        // as the 'initialPath' or a subsequent 'output' event will confirm readiness.
        const initialApiCall = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: "Write-Host '[PWSH Service Init Ping]'", sessionId: this.sessionId }),
        });

        if (!initialApiCall.ok) {
          // This fetch itself failed, which is a more direct problem.
          const errorData = await initialApiCall.json().catch(() => ({ error: `Initialization API request failed with status ${initialApiCall.status}` }));
          const errorMessage = errorData.error || `Initialization API request failed with status ${initialApiCall.status}`;
          console.error(`[PWSH Service ${this.sessionId}] Critical error: Initial API call failed:`, errorMessage);
          this.emit('output', { data: `Error initializing session: ${errorMessage}`, currentPath: this.initialWorkingDir || '~', isError: true });
          this.isInitialized = false;
          this.initializationPromise = null; // Reset promise so it can be retried
          throw new Error(errorMessage); // Propagate error
        }
        
        // At this point, the backend session *should* be starting up.
        // We will wait for an 'initialPath' or 'output' event to confirm full readiness.
        // The 'initialPath' event will set this.isInitialized = true.
        // If an error occurs during backend setup, the 'output' event with isError=true or 'close' will be emitted.
        console.log(`[PWSH Service ${this.sessionId}] Initial API ping sent. Waiting for backend session readiness events.`);
        
        // We don't set isInitialized = true here. It will be set by the event listener
        // for 'initialPath' or the first successful 'output'.

      } catch (err: any) {
        const catchErrorMsg = `Failed to initialize PowerShell session (fetch/network error during initial ping): ${err.message}`;
        console.error(`[PWSH Service ${this.sessionId}] ${catchErrorMsg}`, err);
        this.emit('output', { data: catchErrorMsg, currentPath: this.initialWorkingDir || '~', isError: true });
        this.isInitialized = false;
        this.initializationPromise = null; // Reset promise
        throw err; // Re-throw to reject the initializationPromise
      }
    })();
    
    return this.initializationPromise;
  }

  async executeCommand(command: string): Promise<PowerShellOutput> {
    if (!this.isInitialized) {
      console.warn(`[PWSH Service ${this.sessionId}] Session not initialized. Queuing command or attempting init for: ${command.substring(0,30)}`);
      try {
        await this.initializeSessionIfNotInitialized(); // Ensure init is attempted
        if (!this.isInitialized) { // Check again after attempt
             console.error(`[PWSH Service ${this.sessionId}] Initialization failed. Cannot execute command: ${command.substring(0,30)}`);
             const errorPayload: PowerShellOutput = {
                data: "PowerShell session failed to initialize. Cannot execute command.",
                currentPath: this.initialWorkingDir || '~',
                isError: true,
              };
              this.emit('output', errorPayload);
              return errorPayload;
        }
        console.log(`[PWSH Service ${this.sessionId}] Session initialized after queue. Proceeding with command: ${command.substring(0,30)}`);
      } catch (initError) {
        console.error(`[PWSH Service ${this.sessionId}] Error during lazy initialization for command: ${command.substring(0,30)}`, initError);
        const errorPayload: PowerShellOutput = {
            data: `PowerShell session initialization error: ${(initError as Error).message}.`,
            currentPath: this.initialWorkingDir || '~',
            isError: true,
          };
        this.emit('output', errorPayload);
        return errorPayload;
      }
    }

    // If we reach here, isInitialized should be true.
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          sessionId: this.sessionId,
        }),
      });

      const data = await response.json();
      
      const outputPayload: PowerShellOutput = {
        data: data.output || '',
        currentPath: data.currentPath || this.initialWorkingDir || '~', 
        isError: !!data.error,
      };
      if (data.error && !data.output) { // Error only
        outputPayload.data = `[ERROR] ${data.error}`;
      } else if (data.error && data.output) { // Output and error
        outputPayload.data = `${data.output}\n[ERROR] ${data.error}`;
      }

      this.emit('output', outputPayload); 
      return outputPayload; 

    } catch (err: any) {
      const errorPayload: PowerShellOutput = {
        data: `Failed to execute command: ${err.message}`,
        currentPath: this.initialWorkingDir || '~',
        isError: true,
      };
      this.emit('output', errorPayload);
      return errorPayload; 
    }
  }

  async stop() {
    if (!pwshInstances.has(this.sessionId)) {
        console.log(`[PWSH Service ${this.sessionId}] Stop called on a session that might not have been fully initialized or already removed.`);
        return;
    }
    console.log(`[PWSH Service ${this.sessionId}] Stopping session...`);
    this.isInitialized = false; // Mark as not initialized immediately
    this.initializationPromise = null; // Clear any pending init promise
    try {
      await fetch('/api/terminal', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
        }),
      });
      this.emit('close');
    } catch (err) {
      console.error(`[PWSH Service ${this.sessionId}] Error stopping PowerShell session via API:`, err);
    }
  }

  async getTabCompletions(inputText: string, cursorPosition: number): Promise<TabCompletionResult> {
     if (!this.isInitialized) {
      console.warn(`[PWSH Service ${this.sessionId}] Attempted to get tab completions on uninitialized session.`);
       try {
        await this.initializeSessionIfNotInitialized();
        if(!this.isInitialized) throw new Error("Session could not be initialized for tab completion.");
       } catch(e) {
         return { completions: [], replacement: inputText };
       }
    }
    try {
      const commandForCompletion = `
        $commandInput = '${inputText.replace(/'/g, "''")}';
        $cursorPositionInCommand = ${cursorPosition};
        $completionResult = [System.Management.Automation.CommandCompletion]::CompleteInput($commandInput, $cursorPositionInCommand, $null);
        @{
          CompletionMatches = $completionResult.CompletionMatches | ForEach-Object { $_.CompletionText };
          ReplacementIndex = $completionResult.ReplacementIndex;
          ReplacementLength = $completionResult.ReplacementLength
        } | ConvertTo-Json -Depth 3 -Compress
      `.trim();
      
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandForCompletion, sessionId: this.sessionId }),
      });
      const rawData = await response.json();

      if (rawData.error) {
        console.error("[PWSH Service] Tab completion error from API:", rawData.error);
        return { completions: [], replacement: inputText };
      }
      
      const outputLines = (rawData.output || "").split('\n');
      let jsonOutputString = "";
      for (const line of outputLines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("{") && trimmedLine.endsWith("}")) { 
          jsonOutputString = trimmedLine;
          break;
        }
      }

      if (!jsonOutputString) {
        return { completions: [], replacement: inputText };
      }

      try {
        const parsedOutput = JSON.parse(jsonOutputString);
        const completions: string[] = parsedOutput.CompletionMatches || [];
        const replacement = completions.length > 0 ? completions[0] : inputText; 
        return { completions, replacement };
      } catch (parseError) {
        console.error("[PWSH Service] Error parsing tab completion JSON:", parseError, "Attempted to parse:", jsonOutputString, "Full output:", rawData.output);
        return { completions: [], replacement: inputText };
      }
    } catch (err) {
      console.error("[PWSH Service] Error fetching tab completions:", err);
      return { completions: [], replacement: inputText };
    }
  }

  // Method to be called by event listeners in Terminal.tsx
  public setAsInitialized(initialPath: string) {
    if (!this.isInitialized) {
        console.log(`%c[PWSH Service ${this.sessionId}] Confirmed initialized by event. Path: ${initialPath}. Setting isInitialized = true.`, 'color: green; font-weight: bold;');
        this.isInitialized = true;
        this.initializationPromise = null; // Initialization successful, clear promise
    } else {
        console.log(`%c[PWSH Service ${this.sessionId}] setAsInitialized called, but already initialized. Path: ${initialPath}`, 'color: orange;');
    }
  }
}

const pwshInstances = new Map<string, PowerShellService>();

export function getPowerShellInstance(id: string, workingDir?: string): PowerShellService {
  let instance = pwshInstances.get(id);
  if (!instance) {
    console.log(`[PWSH Service Manager] Creating new instance for ID: ${id}, CWD: ${workingDir}`);
    instance = new PowerShellService(workingDir);
    pwshInstances.set(id, instance);
  } else {
    // console.log(`[PWSH Service Manager] Reusing instance for ID: ${id}`);
  }
  return instance;
}

export function removePowerShellInstance(id: string) {
  const instance = pwshInstances.get(id);
  if (instance) {
    console.log(`[PWSH Service Manager] Removing instance for ID: ${id}`);
    instance.stop(); 
    pwshInstances.delete(id);
  } else {
    console.warn(`[PWSH Service Manager] Attempted to remove non-existent instance for ID: ${id}`);
  }
}