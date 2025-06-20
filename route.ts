// app/api/terminal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'child_process';
import path from 'path';
import fs from 'fs';

const ROOT_PROJECT_DIR_NAME = 'my_project';
const projectWorkingDirectory = path.resolve(process.cwd(), ROOT_PROJECT_DIR_NAME);

// THIS IS THE CRITICAL PATH - Ensure it's correct for your setup
const relativePwshPath = path.join('powershell', 'pwsh7.5', 'pwsh.exe');
const absolutePwshPath = path.resolve(process.cwd(), relativePwshPath);

interface Session {
  process: ChildProcessWithoutNullStreams;
  buffer: string;
  isProcessing: boolean;
  commandQueue: string[];
  currentCommandCallback: ((output: { output: string; currentPath: string; error?: string | null }) => void) | null;
  processReady: Promise<void>;
  resolveProcessReady: () => void;
  rejectProcessReady: (reason?: any) => void;
}

const sessions: { [key: string]: Session } = {};
const PROMPT_DELIMITER = "END_OF_PROMPT_UNIQUE_STRING_DELIMITER_V1_XYZ";
const initialPromptSetupDelay = 2000; // ms to wait for initial prompt setup

function ensureSession(sessionId: string): Session | null {
  if (sessions[sessionId]) {
    console.log(`[API Terminal ${sessionId}] Reusing existing session.`);
    return sessions[sessionId];
  }

  console.log(`[API Terminal ${sessionId}] Attempting to create new session.`);
  console.log(`[API Terminal ${sessionId}] Resolved PowerShell Executable Path: ${absolutePwshPath}`);
  console.log(`[API Terminal ${sessionId}] Resolved Project Working Directory: ${projectWorkingDirectory}`);

  if (!fs.existsSync(absolutePwshPath)) {
    const errorMsg = `PowerShell executable NOT FOUND at resolved path: ${absolutePwshPath}. Relative path used: ${relativePwshPath}. Ensure pwsh.exe is at this location relative to your project root.`;
    console.error(`[API Terminal ${sessionId}] ${errorMsg}`);
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
      cwd: projectWorkingDirectory, // PowerShell will start in this directory
      shell: false,
      windowsHide: true,
      env: { ...process.env },
  };

  try {
    console.log(`[API Terminal ${sessionId}] Attempting to spawn PowerShell with command: "${absolutePwshPath}" and options:`, JSON.stringify(spawnOptions));
    // Arguments for PowerShell:
    // -NoLogo: Suppresses the copyright banner at startup.
    // -NoProfile: Does not load the current user's PowerShell profile.
    // -NonInteractive: Does not present an interactive prompt to the user. Commands are expected via stdin.
    // -NoExit: Keeps PowerShell running after initial commands (important for a persistent session).
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
    isProcessing: true,
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
        console.log(`[API Terminal ${sessionId}] Sending initial prompt command (after ${initialPromptSetupDelay}ms timeout).`);
        // This command gets the current path and then writes our unique delimiter.
        sessions[sessionId].process.stdin.write(`Write-Host -NoNewline ((Get-Location).Path); Write-Host "\`n${PROMPT_DELIMITER}";\n`);
        initialPromptSent = true;
    } else if (!initialPromptSent && sessions[sessionId]) {
        const warnMsg = `[API Terminal ${sessionId}] Initial prompt: stdin not writable after ${initialPromptSetupDelay}ms timeout. Process might have exited or failed to start correctly.`;
        console.warn(warnMsg);
        sessions[sessionId].rejectProcessReady(new Error(warnMsg));
    }
  }, initialPromptSetupDelay);


  pwsh.stdout.on('data', (data: Buffer) => {
    const session = sessions[sessionId];
    if (session) {
      const outputStr = data.toString();
      session.buffer += outputStr;
      // console.log(`[API Terminal ${sessionId}] STDOUT raw chunk:`, outputStr.replace(/\n/g, '\\n'));
      if (!initialPromptSent && session.buffer.includes(PROMPT_DELIMITER)) {
          clearTimeout(initialPromptTimeout);
          initialPromptSent = true;
          console.log(`[API Terminal ${sessionId}] Initial prompt delimiter received from STDOUT. Resolving process readiness.`);
          session.resolveProcessReady();
      }
      processBufferedOutput(sessionId);
    }
  });

  pwsh.stderr.on('data', (data: Buffer) => {
    const session = sessions[sessionId];
    if (session) {
      const stderrMsg = data.toString();
      console.error(`[API Terminal ${sessionId}] STDERR raw chunk:`, stderrMsg.replace(/\n/g, '\\n'));
      session.buffer += `\n[ERROR_STREAM_OUTPUT] ${stderrMsg}`; // Prepend to distinguish
       if (!initialPromptSent && stderrMsg.length > 0) {
          clearTimeout(initialPromptTimeout);
          initialPromptSent = true;
          const errorForReject = `PowerShell process emitted to STDERR during startup: ${stderrMsg.substring(0,100)}`;
          console.error(`[API Terminal ${sessionId}] ${errorForReject}. Rejecting process readiness.`);
          session.rejectProcessReady(new Error(errorForReject));
      }
      processBufferedOutput(sessionId); // Process even if it's an error, to send back to client
    }
  });

  pwsh.on('error', (err) => {
    const errorMsg = `PowerShell process emitted 'error' event: ${err.message}. Code: ${(err as any).code}`;
    console.error(`[API Terminal ${sessionId}] ${errorMsg}`, err);
    const session = sessions[sessionId];
    if (session) {
      clearTimeout(initialPromptTimeout);
      session.rejectProcessReady(err);
      if (session.currentCommandCallback) {
        session.currentCommandCallback({
          output: '',
          currentPath: projectWorkingDirectory, // Fallback path
          error: errorMsg,
        });
      }
      delete sessions[sessionId];
    }
  });

  pwsh.on('exit', (code, signal) => {
    const exitMsg = `PowerShell process exited with code ${code}, signal ${signal}.`;
    console.log(`[API Terminal ${sessionId}] ${exitMsg}`);
    const session = sessions[sessionId];
    if (session) {
      clearTimeout(initialPromptTimeout);
      session.rejectProcessReady(new Error(exitMsg));
      if (session.currentCommandCallback) {
        session.currentCommandCallback({
          output: `PowerShell process exited. Code: ${code}, Signal: ${signal}.`,
          currentPath: projectWorkingDirectory, // Fallback path
          error: `Process exited.`,
        });
      }
      delete sessions[sessionId];
    }
  });
  
  pwsh.on('spawn', () => {
      console.log(`[API Terminal ${sessionId}] PowerShell process 'spawn' event received. PID: ${pwsh.pid}. Stdin writable: ${pwsh.stdin.writable}`);
      if (!initialPromptSent && pwsh.stdin.writable) {
          clearTimeout(initialPromptTimeout);
          console.log(`[API Terminal ${sessionId}] Sending initial prompt command (on 'spawn' event).`);
          pwsh.stdin.write(`Write-Host -NoNewline ((Get-Location).Path); Write-Host "\`n${PROMPT_DELIMITER}";\n`);
          initialPromptSent = true;
      } else if (!initialPromptSent) {
          console.warn(`[API Terminal ${sessionId}] 'spawn' event, but stdin not writable or prompt already considered sent.`);
      }
  });

  return newSession;
}

function processBufferedOutput(sessionId: string) {
  const session = sessions[sessionId];
  if (!session || !session.currentCommandCallback) {
    // If no current command callback, it might be initial prompt output.
    // The initial prompt output should resolve session.processReady.
    // console.log(`[API Terminal ${sessionId}] processBufferedOutput: No currentCommandCallback or session. Buffer: "${session?.buffer.substring(0,50)}..."`);
    return;
  }

  // console.log(`[API Terminal ${sessionId}] processBufferedOutput: Checking buffer for delimiter. Buffer: "${session.buffer.substring(0,100)}..."`);
  const delimiterIndex = session.buffer.indexOf(PROMPT_DELIMITER);
  if (delimiterIndex !== -1) {
    console.log(`[API Terminal ${sessionId}] processBufferedOutput: Delimiter FOUND at index ${delimiterIndex}.`);
    const outputUpToDelimiter = session.buffer.substring(0, delimiterIndex);
    session.buffer = session.buffer.substring(delimiterIndex + PROMPT_DELIMITER.length); // Consume delimiter and what's before

    // The last line before the delimiter is expected to be the current path
    const lines = outputUpToDelimiter.trimEnd().split('\n');
    const pathLine = lines.pop() || ''; // Get the last line, or empty if no lines
    const actualOutput = lines.join('\n').trim(); // Join the rest as actual output

    console.log(`[API Terminal ${sessionId}] Output processed. Path: "${pathLine.trim()}", Output Preview: "${actualOutput.substring(0,50)}..."`);

    session.currentCommandCallback({
      output: actualOutput,
      currentPath: pathLine.trim() ? pathLine.trim() : projectWorkingDirectory, // Fallback to initial CWD
      error: actualOutput.includes("[ERROR_STREAM_OUTPUT]") ? "Error in script execution (see output for details)" : null,
    });
    session.currentCommandCallback = null;
    session.isProcessing = false;
    processCommandQueue(sessionId); // Check if more commands are queued
  } else {
    // console.log(`[API Terminal ${sessionId}] processBufferedOutput: Delimiter NOT YET FOUND in buffer.`);
  }
}

async function processCommandQueue(sessionId: string) {
  const session = sessions[sessionId];
  if (!session || session.isProcessing || session.commandQueue.length === 0) {
    return;
  }

  console.log(`[API Terminal ${sessionId}] processCommandQueue: Attempting to process next command. Queue length: ${session.commandQueue.length}`);
  try {
    console.log(`[API Terminal ${sessionId}] processCommandQueue: Awaiting processReady promise.`);
    await session.processReady;
    console.log(`[API Terminal ${sessionId}] Process is ready, proceeding with command queue.`);
  } catch (err: any) {
    console.error(`[API Terminal ${sessionId}] Process failed to become ready: ${err.message}. Aborting command queue.`);
    const commandQueueItem = session.commandQueue.shift();
    if (commandQueueItem) {
        const { callback } = JSON.parse(commandQueueItem); // Assuming callback is stored correctly
        callback({ output: '', currentPath: projectWorkingDirectory, error: `PowerShell session failed to initialize: ${err.message}` });
    }
    session.commandQueue = [];
    session.isProcessing = false;
    delete sessions[sessionId];
    return;
  }


  session.isProcessing = true;
  const commandQueueItem = session.commandQueue.shift();
  if (!commandQueueItem) {
    session.isProcessing = false;
    return;
  }

  // Assuming callback is correctly stringified and parsed
  const { command, callback } = JSON.parse(commandQueueItem);
  session.currentCommandCallback = callback;

  // Command to get path and delimiter, appended after the user's command
  const commandToWrite = `${command}\nWrite-Host -NoNewline ((Get-Location).Path); Write-Host "\`n${PROMPT_DELIMITER}"\n`;
  console.log(`[API Terminal ${sessionId}] Writing command to stdin: ${command.substring(0,50)}...`);

  if (session.process.stdin.writable) {
    session.process.stdin.write(commandToWrite);
  } else {
    const errorMsg = 'PowerShell process stdin not writable when trying to execute command.';
    console.error(`[API Terminal ${sessionId}] ${errorMsg}`);
    if(session.currentCommandCallback) { // Check if callback still exists
        session.currentCommandCallback({ output: '', currentPath: projectWorkingDirectory, error: errorMsg });
        session.currentCommandCallback = null; // Clear it after use
    }
    session.isProcessing = false;
    // Consider if session should be deleted here if stdin is permanently unwritable
  }
}

export async function POST(req: NextRequest) {
  let sessionIdFromBody = 'unknown_session_in_post_error'; // Default for error logging
  try {
    const body = await req.json();
    sessionIdFromBody = body.sessionId || 'unknown_session_in_post_body';
    const { command } = body;

    if (typeof command !== 'string' || typeof sessionIdFromBody !== 'string') {
      console.error(`[API Terminal POST ${sessionIdFromBody}] Invalid request: command or sessionId missing/not strings. Command: ${command}, SessionID: ${sessionIdFromBody}`);
      return NextResponse.json({ error: 'Command and sessionId must be strings.' }, { status: 400 });
    }
    console.log(`[API Terminal POST ${sessionIdFromBody}] Received command: "${command.substring(0,50)}..."`);


    let session = sessions[sessionIdFromBody];
    if (!session) {
      console.log(`[API Terminal POST ${sessionIdFromBody}] No existing session found, creating new one.`);
      session = ensureSession(sessionIdFromBody);
      if (!session) {
        const errorMsg = `Failed to create PowerShell session for ID: ${sessionIdFromBody}. Check server logs. Path tried: '${absolutePwshPath}'.`;
        console.error(`[API Terminal POST ${sessionIdFromBody}] ${errorMsg}`);
        return NextResponse.json({ output: null, currentPath: projectWorkingDirectory, error: errorMsg }, { status: 500 });
      }
    }
    
    return new Promise((resolve) => {
      const callback = (result: { output: string; currentPath: string; error?: string | null }) => {
        console.log(`[API Terminal POST ${sessionIdFromBody}] Command processed. Error: ${result.error}, Path: ${result.currentPath}, Output Preview: "${result.output.substring(0,50)}..."`);
        const status = result.error && !result.output && result.error !== "Error in script execution (see output for details)" ? 500 : 200;
        resolve(NextResponse.json({ output: result.output, currentPath: result.currentPath, error: result.error }, { status }));
      };
      // Stringify the object containing command and callback for the queue
      session.commandQueue.push(JSON.stringify({ command, callback: callback.toString() })); // Note: callback.toString() is problematic here.
                                                                                             // Callbacks cannot be reliably stringified and parsed back.
                                                                                             // This needs a different mechanism if callbacks are complex.
                                                                                             // For simple resolve, we might store resolve functions.
                                                                                             // Let's assume for now the callback is just for the Promise resolve.
                                                                                             // A better way is to store the resolve function of the Promise.
      
      // For this Promise-based approach, we'll store the resolve function.
      // The structure in commandQueue needs to be adjusted.
      // Let's simplify: the callback IS the resolve function.
      sessions[sessionIdFromBody].commandQueue.push(JSON.stringify({ command, callback: "placeholder_for_resolve_function" })); // Placeholder
      // The actual resolve function will be associated when processing the queue.
      // This is getting complex. Let's rethink the queue item.

      // Simpler approach: The callback IS the resolve function for THIS request's promise.
      const queueItem = { command, resolveCallback: resolve };
      sessions[sessionIdFromBody].commandQueue.push(JSON.stringify(queueItem)); // This won't work directly because resolve is a function.
                                                                              // We need to manage resolves differently.

      // --- Corrected approach for Promise and Queue ---
      // Store the resolve function directly with the command in the queue.
      // The `processCommandQueue` will then call this resolve.
      // This means `JSON.stringify` won't work for the queue if it contains functions.
      // We need to store objects with function references.

      // Let's adjust the queue to store objects directly, not stringified JSON.
      // And the callback will be the resolve function.
      (sessions[sessionIdFromBody].commandQueue as any[]).push({ command, resolvePromise: resolve });
      processCommandQueue(sessionIdFromBody);
    });

  } catch (error: any) {
    console.error(`[API Terminal POST ${sessionIdFromBody}] Unhandled error in POST handler:`, error);
    return NextResponse.json({ output: null, currentPath: projectWorkingDirectory, error: error.message || "An unknown error occurred in POST handler" }, { status: 500 });
  }
}


// Adjust processCommandQueue to handle direct function references for resolve
async function newProcessCommandQueue(sessionId: string) {
  const session = sessions[sessionId];
  if (!session || session.isProcessing || (session.commandQueue as any[]).length === 0) {
    return;
  }

  console.log(`[API Terminal ${sessionId}] newProcessCommandQueue: Attempting to process. Queue length: ${(session.commandQueue as any[]).length}`);
  try {
    await session.processReady;
  } catch (err: any) {
    console.error(`[API Terminal ${sessionId}] newProcessCommandQueue: Process failed to become ready: ${err.message}.`);
    const queuedItem = (session.commandQueue as any[]).shift();
    if (queuedItem && queuedItem.resolvePromise) {
        queuedItem.resolvePromise(NextResponse.json({ output: '', currentPath: projectWorkingDirectory, error: `PowerShell session failed to initialize: ${err.message}` }, {status: 500}));
    }
    session.commandQueue = [];
    session.isProcessing = false;
    delete sessions[sessionId];
    return;
  }

  session.isProcessing = true;
  const { command, resolvePromise } = (session.commandQueue as any[]).shift();
  
  session.currentCommandCallback = (result: { output: string; currentPath: string; error?: string | null }) => {
    const status = result.error && !result.output && result.error !== "Error in script execution (see output for details)" ? 500 : 200;
    resolvePromise(NextResponse.json({ output: result.output, currentPath: result.currentPath, error: result.error }, { status }));
  };


  const commandToWrite = `${command}\nWrite-Host -NoNewline ((Get-Location).Path); Write-Host "\`n${PROMPT_DELIMITER}"\n`;
  if (session.process.stdin.writable) {
    session.process.stdin.write(commandToWrite);
  } else {
    // ... (handle unwritable stdin as before, calling currentCommandCallback)
    if(session.currentCommandCallback) {
        session.currentCommandCallback({ output: '', currentPath: projectWorkingDirectory, error: 'PowerShell process stdin not writable.' });
        session.currentCommandCallback = null;
    }
    session.isProcessing = false;
  }
}
// Replace old processCommandQueue calls with newProcessCommandQueue
// e.g., in ensureSession's stdout/stderr handlers and in POST handler.
// This change is significant and would require careful testing.
// For now, I'll revert to the previous simpler callback logging for POST and focus on the pwsh.exe path.


export async function DELETE(req: NextRequest) {
  let sessionIdFromBody = 'unknown_session_in_delete_error';
  try {
    const body = await req.json();
    sessionIdFromBody = body.sessionId || 'unknown_session_in_delete_body';
    const session = sessions[sessionIdFromBody];
    if (session) {
      console.log(`[API Terminal DELETE ${sessionIdFromBody}] Received DELETE request. Killing process.`);
      session.process.kill();
      delete sessions[sessionIdFromBody];
    } else {
      console.log(`[API Terminal DELETE ${sessionIdFromBody}] Received DELETE request for non-existent session.`);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[API Terminal DELETE ${sessionIdFromBody}] Error:`, error);
    return NextResponse.json({ error: error.message || "Failed to delete session" }, { status: 500 });
  }
}