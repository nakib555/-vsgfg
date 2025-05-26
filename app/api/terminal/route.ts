// app/api/terminal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'child_process'; // Added SpawnOptionsWithoutStdio
import path from 'path';
import fs from 'fs';

const ROOT_PROJECT_DIR_NAME = 'my_project';
const projectWorkingDirectory = path.resolve(process.cwd(), ROOT_PROJECT_DIR_NAME);

const relativePwshPath = path.join('powershell', 'pwsh7.5', 'pwsh.exe');
const absolutePwshPath = path.resolve(process.cwd(), relativePwshPath);

interface Session {
  process: ChildProcessWithoutNullStreams;
  buffer: string;
  isProcessing: boolean;
  commandQueue: string[];
  currentCommandCallback: ((output: { output: string; currentPath: string; error?: string | null }) => void) | null;
  processReady: Promise<void>; // To await initial prompt setup
  resolveProcessReady: () => void; // Resolver for the promise
  rejectProcessReady: (reason?: any) => void; // Rejecter for the promise
}

const sessions: { [key: string]: Session } = {};
const PROMPT_DELIMITER = "END_OF_PROMPT_UNIQUE_STRING_DELIMITER_V1_XYZ";

function ensureSession(sessionId: string): Session | null {
  if (sessions[sessionId]) {
    console.log(`[API Terminal ${sessionId}] Reusing existing session.`);
    return sessions[sessionId];
  }

  console.log(`[API Terminal ${sessionId}] Attempting to create new session.`);
  console.log(`[API Terminal ${sessionId}] Resolved PowerShell Executable Path: ${absolutePwshPath}`);
  console.log(`[API Terminal ${sessionId}] Resolved Project Working Directory: ${projectWorkingDirectory}`);

  if (!fs.existsSync(absolutePwshPath)) {
    const errorMsg = `PowerShell executable NOT FOUND at resolved path: ${absolutePwshPath}. Relative path used: ${relativePwshPath}`;
    console.error(`[API Terminal ${sessionId}] ${errorMsg}`);
    // This session cannot be created. The caller (POST handler) will deal with this.
    return null;
  }
  console.log(`[API Terminal ${sessionId}] PowerShell executable confirmed to exist at: ${absolutePwshPath}`);


  if (!fs.existsSync(projectWorkingDirectory)) {
    try {
      fs.mkdirSync(projectWorkingDirectory, { recursive: true });
      console.log(`[API Terminal ${sessionId}] Created project working directory at: ${projectWorkingDirectory}`);
    } catch (err) {
      const errorMsg = `Failed to create project working directory '${projectWorkingDirectory}': ${(err as Error).message}`;
      console.error(`[API Terminal ${sessionId}] ${errorMsg}`);
      return null;
    }
  }
   console.log(`[API Terminal ${sessionId}] Project working directory confirmed at: ${projectWorkingDirectory}`);


  let pwsh: ChildProcessWithoutNullStreams;
  const spawnOptions: SpawnOptionsWithoutStdio = {
      cwd: projectWorkingDirectory,
      shell: false, // Important for direct executable spawn
      windowsHide: true,
      env: { ...process.env }, // Inherit environment, can be customized
      // detached: false, // Default
  };

  try {
    console.log(`[API Terminal ${sessionId}] Attempting to spawn PowerShell with options:`, JSON.stringify(spawnOptions));
    pwsh = spawn(absolutePwshPath, ['-NoLogo', '-NoProfile', '-NonInteractive', '-NoExit'], spawnOptions);
    console.log(`[API Terminal ${sessionId}] PowerShell process spawn initiated. PID: ${pwsh.pid ?? 'N/A'}`);
  } catch (spawnError: any) {
    const errorMsg = `Synchronous error during spawn of PowerShell process from '${absolutePwshPath}': ${spawnError.message}. Code: ${spawnError.code}, Errno: ${spawnError.errno}, Syscall: ${spawnError.syscall}`;
    console.error(`[API Terminal ${sessionId}] ${errorMsg}`, spawnError);
    return null;
  }

  let resolveProcessReady!: () => void;
  let rejectProcessReady!: (reason?: any) => void;
  const processReadyPromise = new Promise<void>((resolve, reject) => {
    resolveProcessReady = resolve;
    rejectProcessReady = reject;
  });

  const newSession: Session = {
    process: pwsh,
    buffer: '',
    isProcessing: true, // Start as processing until initial prompt is handled
    commandQueue: [],
    currentCommandCallback: null,
    processReady: processReadyPromise,
    resolveProcessReady,
    rejectProcessReady,
  };
  sessions[sessionId] = newSession;

  let initialPromptSent = false;
  const initialPromptTimeout = setTimeout(() => {
    if (!initialPromptSent && sessions[sessionId] && sessions[sessionId].process.stdin.writable) {
        console.log(`[API Terminal ${sessionId}] Sending initial prompt command (after timeout).`);
        sessions[sessionId].process.stdin.write(`Write-Host -NoNewline ((Get-Location).Path); Write-Host "\`n${PROMPT_DELIMITER}";\n`);
        initialPromptSent = true;
    } else if (!initialPromptSent && sessions[sessionId]) {
        const warnMsg = `[API Terminal ${sessionId}] Initial prompt: stdin not writable after ${initialPromptSetupDelay}ms timeout. Process might have exited.`;
        console.warn(warnMsg);
        sessions[sessionId].rejectProcessReady(new Error(warnMsg)); // Reject the ready promise
    }
  }, initialPromptSetupDelay);


  pwsh.stdout.on('data', (data: Buffer) => {
    const session = sessions[sessionId];
    if (session) {
      session.buffer += data.toString();
      // console.log(`[API Terminal ${sessionId}] STDOUT raw:`, data.toString().replace(/\n/g, '\\n'));
      if (!initialPromptSent && session.buffer.includes(PROMPT_DELIMITER)) {
          clearTimeout(initialPromptTimeout);
          initialPromptSent = true; // Mark as sent because we got the delimiter
          console.log(`[API Terminal ${sessionId}] Initial prompt delimiter received from STDOUT.`);
          session.resolveProcessReady();
      }
      processBufferedOutput(sessionId);
    }
  });

  pwsh.stderr.on('data', (data: Buffer) => {
    const session = sessions[sessionId];
    if (session) {
      const stderrMsg = data.toString();
      console.error(`[API Terminal ${sessionId}] STDERR raw:`, stderrMsg.replace(/\n/g, '\\n'));
      session.buffer += `\n[ERROR_STREAM_OUTPUT] ${stderrMsg}`;
       if (!initialPromptSent && stderrMsg.length > 0) { // Any stderr before prompt is bad
          clearTimeout(initialPromptTimeout);
          initialPromptSent = true; // To prevent timeout from also rejecting
          console.error(`[API Terminal ${sessionId}] STDERR received before initial prompt. Rejecting process readiness.`);
          session.rejectProcessReady(new Error(`PowerShell process emitted to STDERR during startup: ${stderrMsg.substring(0,100)}`));
      }
      processBufferedOutput(sessionId);
    }
  });

  pwsh.on('error', (err) => { // This handles errors like ENOENT if spawn itself fails async
    const errorMsg = `PowerShell process emitted 'error' event: ${err.message}. Code: ${(err as any).code}`;
    console.error(`[API Terminal ${sessionId}] ${errorMsg}`, err);
    const session = sessions[sessionId];
    if (session) {
      clearTimeout(initialPromptTimeout);
      session.rejectProcessReady(err); // Reject the ready promise
      if (session.currentCommandCallback) {
        session.currentCommandCallback({
          output: '',
          currentPath: projectWorkingDirectory,
          error: errorMsg,
        });
      }
      delete sessions[sessionId];
    }
  });

  pwsh.on('exit', (code, signal) => { // Changed from 'close' to 'exit' for earlier detection
    const exitMsg = `PowerShell process exited with code ${code}, signal ${signal}.`;
    console.log(`[API Terminal ${sessionId}] ${exitMsg}`);
    const session = sessions[sessionId];
    if (session) {
      clearTimeout(initialPromptTimeout);
      session.rejectProcessReady(new Error(exitMsg)); // Reject if not already resolved
      if (session.currentCommandCallback) {
        session.currentCommandCallback({
          output: `PowerShell process exited. Code: ${code}, Signal: ${signal}.`,
          currentPath: projectWorkingDirectory,
          error: `Process exited.`,
        });
      }
      delete sessions[sessionId];
    }
  });
  
  // Don't send initial command immediately, wait for 'spawn' event or timeout
  pwsh.on('spawn', () => {
      console.log(`[API Terminal ${sessionId}] PowerShell process 'spawn' event received. PID: ${pwsh.pid}. Stdin writable: ${pwsh.stdin.writable}`);
      if (!initialPromptSent && pwsh.stdin.writable) {
          clearTimeout(initialPromptTimeout); // Clear timeout if spawn happens quickly
          console.log(`[API Terminal ${sessionId}] Sending initial prompt command (on 'spawn' event).`);
          pwsh.stdin.write(`Write-Host -NoNewline ((Get-Location).Path); Write-Host "\`n${PROMPT_DELIMITER}";\n`);
          initialPromptSent = true;
      } else if (!initialPromptSent) {
          console.warn(`[API Terminal ${sessionId}] 'spawn' event, but stdin not writable or prompt already considered sent.`);
      }
  });

  return newSession;
}
const initialPromptSetupDelay = 2000; // ms to wait for initial prompt setup

function processBufferedOutput(sessionId: string) {
  const session = sessions[sessionId];
  // Only process if there's a callback *AND* the process is ready (initial prompt received)
  if (!session || !session.currentCommandCallback) {
    // If no current command callback, it might be initial prompt output
    if (session && !session.currentCommandCallback && session.buffer.includes(PROMPT_DELIMITER) && !session.processReady.isPrototypeOf(Promise)) {
        // This condition is tricky, processReady is a promise.
        // The main idea is that initial prompt output should resolve session.processReady
        // and not be handled by a command callback.
    }
    return;
  }


  const delimiterIndex = session.buffer.indexOf(PROMPT_DELIMITER);
  if (delimiterIndex !== -1) {
    const outputUpToDelimiter = session.buffer.substring(0, delimiterIndex);
    session.buffer = session.buffer.substring(delimiterIndex + PROMPT_DELIMITER.length);

    const lines = outputUpToDelimiter.trimEnd().split('\n');
    const pathLine = lines.pop() || '';
    const actualOutput = lines.join('\n').trim();

    console.log(`[API Terminal ${sessionId}] Output processed. Path: ${pathLine.trim()}, Output Preview: ${actualOutput.substring(0,50)}...`);

    session.currentCommandCallback({
      output: actualOutput,
      currentPath: pathLine.trim() ? pathLine.trim() : projectWorkingDirectory,
      error: actualOutput.includes("[ERROR_STREAM_OUTPUT]") ? "Error in script execution (see output for details)" : null,
    });
    session.currentCommandCallback = null;
    session.isProcessing = false;
    processCommandQueue(sessionId);
  }
}

async function processCommandQueue(sessionId: string) { // Made async to await processReady
  const session = sessions[sessionId];
  if (!session || session.isProcessing || session.commandQueue.length === 0) {
    return;
  }

  try {
    await session.processReady; // Wait for initial prompt to be resolved
    console.log(`[API Terminal ${sessionId}] Process is ready, proceeding with command queue.`);
  } catch (err: any) {
    console.error(`[API Terminal ${sessionId}] Process failed to become ready: ${err.message}. Aborting command queue.`);
    // Clear queue or handle error for queued commands
    const commandQueueItem = session.commandQueue.shift(); // Get the current command
    if (commandQueueItem) {
        const { callback } = JSON.parse(commandQueueItem);
        callback({ output: '', currentPath: projectWorkingDirectory, error: `PowerShell session failed to initialize: ${err.message}` });
    }
    session.commandQueue = []; // Clear remaining queue
    session.isProcessing = false; // Ensure not stuck
    delete sessions[sessionId]; // Session is unusable
    return;
  }


  session.isProcessing = true;
  const commandQueueItem = session.commandQueue.shift();
  if (!commandQueueItem) {
    session.isProcessing = false;
    return;
  }
  const { command, callback } = JSON.parse(commandQueueItem);
  session.currentCommandCallback = callback;

  const commandToWrite = `${command}\nWrite-Host -NoNewline ((Get-Location).Path); Write-Host "\`n${PROMPT_DELIMITER}"\n`;
  console.log(`[API Terminal ${sessionId}] Writing command to stdin: ${command.substring(0,50)}...`);

  if (session.process.stdin.writable) {
    session.process.stdin.write(commandToWrite);
  } else {
    const errorMsg = 'PowerShell process stdin not writable when trying to execute command.';
    console.error(`[API Terminal ${sessionId}] ${errorMsg}`);
    callback({ output: '', currentPath: projectWorkingDirectory, error: errorMsg });
    session.isProcessing = false; // Reset processing state
    // Consider if session should be deleted here
    // delete sessions[sessionId];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { command, sessionId } = await req.json();
    if (typeof command !== 'string' || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Command and sessionId must be strings.' }, { status: 400 });
    }
    console.log(`[API Terminal POST ${sessionId}] Received command: ${command.substring(0,50)}...`);


    let session = sessions[sessionId];
    if (!session) {
      session = ensureSession(sessionId);
      if (!session) {
        const errorMsg = `Failed to create PowerShell session for ID: ${sessionId}. Check server logs. Path tried: '${absolutePwshPath}'.`;
        console.error(`[API Terminal POST] ${errorMsg}`);
        return NextResponse.json({ output: null, currentPath: projectWorkingDirectory, error: errorMsg }, { status: 500 });
      }
    }
    
    // For the very first command (often the benign one from initializeSessionIfNotInitialized),
    // we need to ensure its callback is set up correctly if it's not the initial prompt command.
    if (command === "Write-Host -NoNewline ''" && !session.currentCommandCallback) {
        // This is likely the benign command from initializeSessionIfNotInitialized in PowerShellService
        // or the refresh path command from Terminal.tsx.
        // Its output will be handled by the 'output' event which then sets isExecuting to false.
        // The processReady promise handles the true "initialization".
    }


    return new Promise((resolve) => {
      const callback = (result: { output: string; currentPath: string; error?: string | null }) => {
        console.log(`[API Terminal POST ${sessionId}] Command processed. Error: ${result.error}, Path: ${result.currentPath}`);
        const status = result.error && !result.output && result.error !== "Error in script execution (see output for details)" ? 500 : 200;
        resolve(NextResponse.json({ output: result.output, currentPath: result.currentPath, error: result.error }, { status }));
      };
      session.commandQueue.push(JSON.stringify({ command, callback }));
      processCommandQueue(sessionId); // This is now async
    });

  } catch (error: any) {
    const sessionIdFromBody = (await req.json().catch(() => ({}))).sessionId || 'unknown';
    console.error(`[API Terminal POST ${sessionIdFromBody}] Unhandled error in POST handler:`, error);
    return NextResponse.json({ output: null, currentPath: projectWorkingDirectory, error: error.message || "An unknown error occurred in POST handler" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    const session = sessions[sessionId];
    if (session) {
      console.log(`[API Terminal ${sessionId}] Received DELETE request. Killing process.`);
      session.process.kill(); // Send SIGTERM
      delete sessions[sessionId]; // Remove from map
    } else {
      console.log(`[API Terminal ${sessionId}] Received DELETE request for non-existent session.`);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const sessionIdFromBody = (await req.json().catch(() => ({}))).sessionId || 'unknown';
    console.error(`[API Terminal DELETE ${sessionIdFromBody}] Error:`, error);
    return NextResponse.json({ error: error.message || "Failed to delete session" }, { status: 500 });
  }
}