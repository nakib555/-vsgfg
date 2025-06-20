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
  public initialWorkingDir: string | undefined;
  public isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(workingDir?: string) {
    super();
    this.initialWorkingDir = workingDir;
    this.sessionId = Math.random().toString(36).substring(7);
    console.log(`[PWSH Service CONSTRUCTOR ${this.sessionId}] Instance created. Initial CWD target: ${workingDir}`);
  }

  async initializeSessionIfNotInitialized(): Promise<void> {
    console.log(`[PWSH Service ${this.sessionId}] initializeSessionIfNotInitialized CALLED. isInitialized: ${this.isInitialized}, initializationPromise: ${!!this.initializationPromise}`);
    if (this.isInitialized) {
      console.log(`[PWSH Service ${this.sessionId}] Already initialized. Emitting current path via benign command.`);
      this.executeCommand("Write-Host -NoNewline ''"); // This will re-confirm path via 'output' event
      return;
    }

    if (this.initializationPromise) {
      console.log(`[PWSH Service ${this.sessionId}] Initialization already in progress. Awaiting existing promise.`);
      return this.initializationPromise;
    }

    console.log(`[PWSH Service ${this.sessionId}] Starting initialization process...`);
    this.initializationPromise = (async () => {
      try {
        console.log(`[PWSH Service ${this.sessionId}] Sending initial API ping to /api/terminal for session creation.`);
        const initialApiCall = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: "Write-Host '[PWSH Service Init Ping]'", sessionId: this.sessionId }),
        });

        if (!initialApiCall.ok) {
          const errorData = await initialApiCall.json().catch(() => ({ error: `Initialization API request failed with status ${initialApiCall.status}` }));
          const errorMessage = errorData.error || `Initialization API request failed with status ${initialApiCall.status}`;
          console.error(`[PWSH Service ${this.sessionId}] Critical error: Initial API call failed:`, errorMessage);
          this.emit('output', { data: `Error initializing session: ${errorMessage}`, currentPath: this.initialWorkingDir || '~', isError: true });
          this.isInitialized = false; // Ensure it's marked as not initialized
          this.initializationPromise = null; // Reset promise so it can be retried
          throw new Error(errorMessage);
        }
        const initialResponseData = await initialApiCall.json(); // Expecting a response from the POST
        console.log(`[PWSH Service ${this.sessionId}] Initial API ping response:`, initialResponseData);
        // The backend's ensureSession will handle the actual PowerShell process startup.
        // We wait for 'initialPath' or 'output' (with delimiter) from the backend to confirm readiness.
        console.log(`[PWSH Service ${this.sessionId}] Initial API ping sent. Waiting for backend session readiness events (initialPath or output).`);
        // isInitialized will be set to true by setAsInitialized via an event from Terminal.tsx
      } catch (err: any) {
        const catchErrorMsg = `Failed to initialize PowerShell session (fetch/network error during initial ping): ${err.message}`;
        console.error(`[PWSH Service ${this.sessionId}] ${catchErrorMsg}`, err);
        this.emit('output', { data: catchErrorMsg, currentPath: this.initialWorkingDir || '~', isError: true });
        this.isInitialized = false;
        this.initializationPromise = null;
        throw err; // Re-throw to reject the initializationPromise
      }
    })();
    
    return this.initializationPromise;
  }

  async executeCommand(command: string): Promise<PowerShellOutput> {
    console.log(`[PWSH Service ${this.sessionId}] executeCommand CALLED with: "${command.substring(0,50)}...". isInitialized: ${this.isInitialized}`);
    if (!this.isInitialized) {
      console.warn(`[PWSH Service ${this.sessionId}] Session not initialized. Attempting lazy init for command: ${command.substring(0,30)}`);
      try {
        await this.initializeSessionIfNotInitialized(); // Ensure init is attempted
        if (!this.isInitialized) { // Check again after attempt
             console.error(`[PWSH Service ${this.sessionId}] Initialization failed after lazy attempt. Cannot execute command: ${command.substring(0,30)}`);
             const errorPayload: PowerShellOutput = {
                data: "PowerShell session failed to initialize. Cannot execute command.",
                currentPath: this.initialWorkingDir || '~',
                isError: true,
              };
              this.emit('output', errorPayload); // Emit error so UI can update
              return errorPayload;
        }
        console.log(`[PWSH Service ${this.sessionId}] Session initialized after lazy attempt. Proceeding with command: ${command.substring(0,30)}`);
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

    console.log(`[PWSH Service ${this.sessionId}] Executing command: "${command.substring(0,50)}..." via API.`);
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
      console.log(`[PWSH Service ${this.sessionId}] API response for command "${command.substring(0,50)}...":`, data);
      
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

      console.log(`[PWSH Service ${this.sessionId}] Emitting 'output' event for command "${command.substring(0,50)}...":`, outputPayload);
      this.emit('output', outputPayload); 
      return outputPayload; 

    } catch (err: any) {
      console.error(`[PWSH Service ${this.sessionId}] Fetch error during executeCommand for "${command.substring(0,50)}...":`, err);
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
    console.log(`[PWSH Service ${this.sessionId}] stop CALLED. isInitialized: ${this.isInitialized}`);
    
    const instanceExistsInMap = pwshInstances.has(this.sessionId);

    if (!instanceExistsInMap) {
        console.warn(`[PWSH Service ${this.sessionId}] Stop called, but instance not found in client-side map. This might be due to early init failure or prior removal. Will still attempt backend cleanup.`);
    }
    
    this.isInitialized = false;
    this.initializationPromise = null; 

    try {
      console.log(`[PWSH Service ${this.sessionId}] Sending DELETE request to /api/terminal to ensure backend cleanup.`);
      await fetch('/api/terminal', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
        }),
      });
      console.log(`[PWSH Service ${this.sessionId}] Emitting 'close' event locally.`);
      this.emit('close');
    } catch (err) {
      console.error(`[PWSH Service ${this.sessionId}] Error stopping PowerShell session via API:`, err);
    }
  }

  async getTabCompletions(inputText: string, cursorPosition: number): Promise<TabCompletionResult> {
     console.log(`[PWSH Service ${this.sessionId}] getTabCompletions CALLED. Input: "${inputText}", Pos: ${cursorPosition}, isInitialized: ${this.isInitialized}`);
     if (!this.isInitialized) {
      console.warn(`[PWSH Service ${this.sessionId}] Attempted to get tab completions on uninitialized session. Attempting lazy init.`);
       try {
        await this.initializeSessionIfNotInitialized();
        if(!this.isInitialized) throw new Error("Session could not be initialized for tab completion.");
       } catch(e) {
         console.error(`[PWSH Service ${this.sessionId}] Lazy init failed for tab completion:`, e);
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
      
      console.log(`[PWSH Service ${this.sessionId}] Sending tab completion command to API.`);
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandForCompletion, sessionId: this.sessionId }),
      });
      const rawData = await response.json();
      console.log(`[PWSH Service ${this.sessionId}] Tab completion API response:`, rawData);


      if (rawData.error) {
        console.error(`[PWSH Service ${this.sessionId}] Tab completion error from API:`, rawData.error);
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
        console.warn(`[PWSH Service ${this.sessionId}] No JSON found in tab completion output. Full output:`, rawData.output);
        return { completions: [], replacement: inputText };
      }

      try {
        const parsedOutput = JSON.parse(jsonOutputString);
        const completions: string[] = parsedOutput.CompletionMatches || [];
        const replacement = completions.length > 0 ? completions[0] : inputText; 
        console.log(`[PWSH Service ${this.sessionId}] Parsed tab completions:`, completions);
        return { completions, replacement };
      } catch (parseError) {
        console.error(`[PWSH Service ${this.sessionId}] Error parsing tab completion JSON:`, parseError, "Attempted to parse:", jsonOutputString, "Full output:", rawData.output);
        return { completions: [], replacement: inputText };
      }
    } catch (err) {
      console.error(`[PWSH Service ${this.sessionId}] Error fetching tab completions:`, err);
      return { completions: [], replacement: inputText };
    }
  }

  public setAsInitialized(initialPath: string) {
    if (!this.isInitialized) {
        console.log(`%c[PWSH Service ${this.sessionId}] setAsInitialized CALLED. Path: "${initialPath}". Setting isInitialized = true.`, 'color: green; font-weight: bold;');
        this.isInitialized = true;
        this.initializationPromise = null; // Initialization successful, clear promise
    } else {
        console.log(`%c[PWSH Service ${this.sessionId}] setAsInitialized called, but already initialized. Path: "${initialPath}"`, 'color: orange;');
    }
  }
}

const pwshInstances = new Map<string, PowerShellService>();

export function getPowerShellInstance(id: string, workingDir?: string): PowerShellService {
  let instance = pwshInstances.get(id);
  if (!instance) {
    console.log(`[PWSH Service Manager] Creating new instance for ID: ${id}, CWD target: ${workingDir}`);
    instance = new PowerShellService(workingDir);
    pwshInstances.set(id, instance);
  } else {
    // console.log(`[PWSH Service Manager] Reusing instance for ID: ${id}. Current CWD for instance: ${instance.initialWorkingDir}`);
    if (workingDir && instance.initialWorkingDir !== workingDir && !instance.isInitialized) {
        // If a workingDir is provided for an existing but uninitialized instance,
        // and it's different, update the instance's target initialWorkingDir.
        // This might happen if the component re-renders with a new workingDir before the instance fully initializes.
        console.warn(`[PWSH Service Manager] Reusing UNINITIALIZED instance for ID: ${id}, but requested workingDir "${workingDir}" differs from instance's initial target "${instance.initialWorkingDir}". Updating target.`);
        instance.initialWorkingDir = workingDir;
    } else if (workingDir && instance.initialWorkingDir !== workingDir && instance.isInitialized) {
        console.warn(`[PWSH Service Manager] Reusing INITIALIZED instance for ID: ${id}. Requested workingDir "${workingDir}" differs from instance's initial "${instance.initialWorkingDir}". The CWD of the running PowerShell process will not change automatically; use 'cd' command.`);
    }
  }
  return instance;
}

export function removePowerShellInstance(id: string) {
  const instance = pwshInstances.get(id);
  if (instance) {
    console.log(`[PWSH Service Manager] Removing instance for ID: ${id}. Calling instance.stop().`);
    instance.stop(); 
    pwshInstances.delete(id);
  } else {
    console.warn(`[PWSH Service Manager] Attempted to remove non-existent instance for ID: ${id}. Attempting direct backend cleanup as a precaution.`);
    fetch('/api/terminal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
    }).catch(err => console.error(`[PWSH Service Manager] Error during precautionary backend cleanup for ${id}:`, err));
  }
}