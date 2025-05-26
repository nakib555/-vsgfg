// components/sidebar-parts/chat-interface.tsx
"use client";
import { AlertTriangle, CheckCircle2, Info, Loader2, Square, File as FileIconLucide, Terminal as TerminalIconLucide, PlayCircle, Folder as FolderIcon } from "lucide-react"; // Added FolderIcon
import React, { useRef, useCallback, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Copy, Check, Code, FileCode } from "lucide-react";
import { cn, debounce } from "@/lib/utils"; // Import debounce
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Highlighter, Lang, Theme as ShikiTheme } from 'shiki';
import { liveHighlightStrings, convertAsciiTableToMarkdown } from '@/lib/markdown-utils';
import { escapeHtml } from '@/lib/html-utils';
import { toast } from "sonner";


export interface AiActionStep {
  type: "createFile" | "createFolder" | "runCommand" | "startApplication";
  description: string;
  targetPath?: string; 
  content?: string;    
  command?: string;    
  commandDisplay?: string; 
  // --- Fields for UI state, not from AI ---
  id: string; // Client-generated unique ID for the step instance
  currentStatus: 'idle' | 'pending' | 'success' | 'error';
  output?: string; // For command output
  errorMessage?: string; // For step-specific errors
}
export interface AiActionBlock {
  steps: AiActionStep[];
  project?: string; 
}

export interface MessageType {
  id: string;
  role: "user" | "assistant";
  content: string; 
  actionBlock?: AiActionBlock | null;
  timestamp: Date;
  isTyping?: boolean; 
  
  _mainContentBefore?: string;
  _mainContentAfter?: string;  
  _actionsProcessed?: boolean; 
  _currentTextPart?: 'before' | 'after'; 
}

export interface TypingState {
  displayedText: string;
  charIndex: number;
}

interface HighlightedCodeBlockProps {
  code: string;
  language: string;
  highlighter: Highlighter | null;
  codeBlockTheme: ShikiTheme;
}

const HighlightedCodeBlock: React.FC<HighlightedCodeBlockProps> = React.memo(({ code, language, highlighter, codeBlockTheme }) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(false);

  const knownShortLangs = ['c', 'r', 'go', 'js', 'ts', 'py', 'md', 'rb', 'cs', 'fs', 'sh', 'ps1'];

  useEffect(() => {
    let isMounted = true;
    async function highlight() {
      if (!code) {
        if (isMounted) setHighlightedHtml("");
        return;
      }
      if (highlighter) {
        const validLang = language?.toLowerCase() as Lang || 'plaintext'; 
        const loadedLanguages = highlighter.getLoadedLanguages();
        const isPotentiallyComplete = validLang.length >=1 && (loadedLanguages.includes(validLang) || validLang.length >=2 || knownShortLangs.includes(validLang));


        if (!loadedLanguages.includes(validLang) && isPotentiallyComplete) {
          if (isMounted) setIsLoadingLanguage(true);
          try {
            const resolvedLang = highlighter.getLang(validLang);
            if (resolvedLang && loadedLanguages.includes(resolvedLang.id as Lang)) {
                 const html = highlighter.codeToHtml(code, { lang: resolvedLang.id as Lang, theme: codeBlockTheme });
                 if (isMounted) setHighlightedHtml(html);
            } else {
                await highlighter.loadLanguage(validLang);
                if (isMounted && highlighter.getLoadedLanguages().includes(validLang)) {
                  const html = highlighter.codeToHtml(code, { lang: validLang, theme: codeBlockTheme });
                  if (isMounted) setHighlightedHtml(html);
                } else if (isMounted) {
                  console.warn(`Shiki: Language "${validLang}" could not be loaded or is not recognized after attempt. Falling back.`);
                  setHighlightedHtml(`<pre class="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre>`);
                }
            }
          } catch (loadErr) {
            if (isMounted) setHighlightedHtml(`<pre class="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre>`);
          } finally {
            if (isMounted) setIsLoadingLanguage(false);
          }
        } else if (loadedLanguages.includes(validLang)) {
          const html = highlighter.codeToHtml(code, { lang: validLang, theme: codeBlockTheme });
          if (isMounted) setHighlightedHtml(html);
          if (isMounted) setIsLoadingLanguage(false);
        } else {
          if (isMounted) {
            setHighlightedHtml(`<pre class="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre>`);
            setIsLoadingLanguage(false);
          }
        }
      } else {
        if (isMounted) {
          setHighlightedHtml(`<pre class="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre>`);
          setIsLoadingLanguage(false);
        }
      }
    }
    highlight();
    return () => { isMounted = false; };
  }, [code, language, highlighter, codeBlockTheme, knownShortLangs]);

  if (isLoadingLanguage && code) { 
    return <div className="shiki-container"><pre className="shiki-fallback p-2 text-xs"><code>Loading syntax for "{language}"...</code></pre></div>;
  }

  if (!code) return null;
  if (!highlighter && code) { 
     return <div className="shiki-container"><pre className="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre></div>;
  }
  if (!highlightedHtml && code && !isLoadingLanguage) { 
     return <div className="shiki-container"><pre className="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre></div>;
  }


  return <div className="shiki-container" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
});
HighlightedCodeBlock.displayName = 'HighlightedCodeBlock';


interface ChatInterfaceProps {
  messages: MessageType[];
  setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>; // To update step statuses
  typingStates: Record<string, TypingState>;
  setTypingStates: React.Dispatch<React.SetStateAction<Record<string, TypingState>>>;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isAISending: boolean;
  activeApiKey: string | null;
  selectedModel: string;
  copiedId: string | null;
  onCopyToClipboard: (text: string, id: string) => void;
  highlighter: Highlighter | null;
  selectedShikiTheme: ShikiTheme;
  enableCopy: boolean;
  typingSpeed: number;
  onStopGenerating: () => void;
  onAiOpenFileInEditor: (filePath: string) => Promise<void>;
  onAiCreateFileAndType: (filePath: string, content: string) => Promise<void>;
  onAiExecuteTerminalCommand: (command: string) => Promise<{ success: boolean; output: string }>;
  onRefreshFileTree: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  setMessages,
  typingStates,
  setTypingStates,
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyDown,
  isAISending,
  activeApiKey,
  selectedModel,
  copiedId,
  onCopyToClipboard,
  highlighter,
  selectedShikiTheme,
  enableCopy,
  typingSpeed,
  onStopGenerating,
  onAiOpenFileInEditor,
  onAiExecuteTerminalCommand,
  onAiCreateFileAndType,
  onRefreshFileTree,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isClient, setIsClient] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null); 
  const [currentProcessingStepVisual, setCurrentProcessingStepVisual] = useState<{ messageId: string; stepId: string } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      } else if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };
    const debouncedScrollToBottom = debounce(scrollToBottom, 50); 
    debouncedScrollToBottom();
  }, [
    messages.length, 
    messages[messages.length - 1]?.id, 
    typingStates[messages[messages.length - 1]?.id]?.displayedText, 
    currentProcessingStepVisual, 
    messages[messages.length - 1]?.actionBlock?.steps.find(s => s.id === currentProcessingStepVisual?.stepId)?.currentStatus
  ]);


  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(e.target.scrollHeight, 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const getActionStepIcon = (type: AiActionStep['type']) => {
    switch (type) {
      case 'createFile':
        return <FileIconLucide className="ai-action-step-icon" />;
      case 'createFolder':
        return <FolderIcon className="ai-action-step-icon" />; // Using FolderIcon for createFolder
      case 'runCommand':
        return <TerminalIconLucide className="ai-action-step-icon" />;
      case 'startApplication':
        return <PlayCircle className="ai-action-step-icon" />;
      default:
        return <Info className="ai-action-step-icon" />;
    }
  };

  const processActionsSequentially = useCallback(async (messageId: string, actionBlock: AiActionBlock) => {
    for (const step of actionBlock.steps) {
      setCurrentProcessingStepVisual({ messageId, stepId: step.id });
      setMessages(prev => prev.map(msg => 
        msg.id === messageId && msg.actionBlock ? {
          ...msg,
          actionBlock: {
            ...msg.actionBlock,
            steps: msg.actionBlock.steps.map(s => s.id === step.id ? { ...s, currentStatus: 'pending' } : s)
          }
        } : msg
      ));

      let success = false;
      let stepOutput = "";
      let stepErrorMessage = "";

      try {
        switch (step.type) {
          case 'createFile':
            if (step.targetPath && typeof step.content === 'string') {
              await onAiCreateFileAndType(step.targetPath, step.content);
              success = true;
            } else {
              throw new Error("Missing targetPath or content for createFile action.");
            }
            break;
          case 'createFolder':
            if (step.targetPath) {
              // Assuming API handles folder creation via a similar mechanism or a dedicated one
              // For now, let's simulate it with a POST to /api/files with a 'createFolder' type
              const apiResponse = await fetch('/api/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetPath: step.targetPath, type: 'createFolder' }),
              });
              if (!apiResponse.ok) {
                const errorData = await apiResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to create folder ${step.targetPath}`);
              }
              await onRefreshFileTree(); // Refresh file tree after successful creation
              success = true;
            } else {
              throw new Error("Missing targetPath for createFolder action.");
            }
            break;
          case 'runCommand':
          case 'startApplication':
            if (step.command) {
              const result = await onAiExecuteTerminalCommand(step.command);
              success = result.success;
              stepOutput = result.output;
              if (!success) stepErrorMessage = result.output || "Command execution failed.";
            } else {
              throw new Error("Missing command for runCommand/startApplication action.");
            }
            break;
          default:
            console.warn("Unknown action type:", step.type);
            stepErrorMessage = `Unknown action type: ${step.type}`;
        }
      } catch (error: any) {
        console.error(`Error processing action step ${step.id} (${step.description}):`, error);
        success = false;
        stepErrorMessage = error.message || "An unknown error occurred during action execution.";
      }

      setMessages(prev => prev.map(msg => 
        msg.id === messageId && msg.actionBlock ? {
          ...msg,
          actionBlock: {
            ...msg.actionBlock,
            steps: msg.actionBlock.steps.map(s => s.id === step.id ? { 
              ...s, 
              currentStatus: success ? 'success' : 'error',
              output: stepOutput,
              errorMessage: stepErrorMessage 
            } : s)
          }
        } : msg
      ));
      if (!success && step.type !== 'runCommand' && step.type !== 'startApplication') { // Stop on critical errors for file ops
          toast.error(`Action failed: ${step.description}. ${stepErrorMessage}`);
          break; 
      }
    }
    setCurrentProcessingStepVisual(null);
    // After all actions are processed, trigger typing of _mainContentAfter if it exists
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const shouldTypeAfter = !!msg._mainContentAfter;
        return {
          ...msg,
          _actionsProcessed: true,
          content: shouldTypeAfter ? "" : msg.content, // Reset content if typing after, else keep
          isTyping: shouldTypeAfter,
          _currentTextPart: shouldTypeAfter ? 'after' : msg._currentTextPart,
          _mainContentBefore: shouldTypeAfter ? msg._mainContentAfter : msg._mainContentBefore, // Prepare for typing 'after' part
          _mainContentAfter: shouldTypeAfter ? "" : msg._mainContentAfter, // Clear after it's moved
        };
      }
      return msg;
    }));
    if (messages.find(m => m.id === messageId)?._mainContentAfter && typingSpeed > 0) {
        setTypingStates(prev => ({...prev, [messageId]: { displayedText: "", charIndex: 0 }}));
    }

  }, [onAiCreateFileAndType, onAiExecuteTerminalCommand, onRefreshFileTree, setMessages, typingSpeed, setTypingStates]);


  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.isTyping && lastMessage.actionBlock && !lastMessage._actionsProcessed) {
      processActionsSequentially(lastMessage.id, lastMessage.actionBlock);
    }
  }, [messages, processActionsSequentially]);


  const renderActionBlock = (messageId: string, actionBlock: AiActionBlock) => {
    return (
      <div className="ai-action-progress-bar-container">
        {actionBlock.project && <h3 className="text-base font-semibold mb-2 text-foreground">{actionBlock.project}</h3>}
        {actionBlock.steps.map((step) => {
          const isActiveStep = currentProcessingStepVisual?.messageId === messageId && currentProcessingStepVisual?.stepId === step.id;
          return (
            <div key={step.id} className={cn("ai-action-step", isActiveStep && "step-active")}>
              <div className="ai-action-step-indicator-wrapper">
                {getActionStepIcon(step.type)}
              </div>
              <div className="ai-action-step-content">
                <div className="flex items-center justify-between">
                    <p className={cn("ai-action-step-description", step.currentStatus === 'success' && 'description-completed')}>
                    {step.description}
                    </p>
                    {step.currentStatus === 'pending' && <Loader2 className="ai-action-step-status-icon status-pending" />}
                    {step.currentStatus === 'success' && <CheckCircle2 className="ai-action-step-status-icon status-success" />}
                    {step.currentStatus === 'error' && <AlertTriangle className="ai-action-step-status-icon status-error" />}
                    {step.currentStatus === 'idle' && <Info className="ai-action-step-status-icon status-idle" />}
                </div>
                {(step.type === 'runCommand' || step.type === 'startApplication') && (step.commandDisplay || step.command) && (
                  <div className="ai-action-command-box">
                    {step.commandDisplay || step.command}
                  </div>
                )}
                {step.targetPath && (step.type === 'createFile' || step.type === 'createFolder') && (
                  <p className="ai-action-file-details">
                    Target: <code>{step.targetPath}</code>
                  </p>
                )}
                {step.currentStatus === 'error' && step.errorMessage && (
                  <p className="ai-action-error-message">{step.errorMessage}</p>
                )}
                 {step.currentStatus === 'success' && step.output && step.type === 'runCommand' && (
                  <pre className="ai-action-command-box mt-1.5 !bg-background/50 max-h-20 overflow-y-auto text-xs">
                    {step.output}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  const formatMessageContent = useCallback((message: MessageType) => {
    const { id: messageId, content, actionBlock, isTyping, _currentTextPart, _mainContentBefore, _mainContentAfter } = message;
    const currentTypingState = typingStates[messageId];
    
    let textToDisplay = content; // Content is now the already typed portion
    if (isTyping && currentTypingState && typingSpeed > 0) {
      // If still typing, displayedText from typingState is more up-to-date for the current part
      textToDisplay = currentTypingState.displayedText;
    }


    const renderMarkdown = (text: string | undefined) => {
      if (!text) return null;
      let processedText = text;
      if (text.includes('|') || text.includes('+--')) {
        processedText = convertAsciiTableToMarkdown(text);
      }
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            p: ({node, ...props}) => {
              return <p {...props} />;
            },
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeContent = String(children).replace(/\n$/, '');
              if (!inline && match) {
                const language = match[1];
                const codeBlockId = `${messageId}-code-${node?.position?.start.offset || Math.random()}`;
                return (
                  <div className="ai-chat-code-block relative my-3 rounded-md group/codeblock bg-muted/30">
                    <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border flex justify-between items-center bg-muted/50 rounded-t-md">
                      <span>{language}</span>
                      {enableCopy && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-50 group-hover/codeblock:opacity-100 transition-opacity"
                          onClick={() => onCopyToClipboard(codeContent, codeBlockId)}
                          title="Copy code"
                        >
                          {copiedId === codeBlockId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                    <HighlightedCodeBlock
                      code={codeContent}
                      language={language}
                      highlighter={highlighter}
                      codeBlockTheme={selectedShikiTheme}
                    />
                  </div>
                );
              }
              return (
                <code className={cn("not-prose", className)} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {processedText}
        </ReactMarkdown>
      );
    };
    
    const renderedMainContent = textToDisplay ? renderMarkdown(textToDisplay) : null;
    // Render action block only if actions are not yet processed OR if they are processed and there's no "after" content to type
    const shouldRenderActionBlock = actionBlock && (!_actionsProcessed || ( _actionsProcessed && !_mainContentAfter && _currentTextPart !== 'after'));
    const renderedActionBlock = shouldRenderActionBlock ? renderActionBlock(messageId, actionBlock) : null;

    // Determine if the typing cursor should be shown
    const textBeingTyped = _currentTextPart === 'before' ? _mainContentBefore : _mainContentAfter;
    const showTypingCursor = isTyping && textToDisplay.length < (textBeingTyped || "").length && typingSpeed > 0;

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1">
        {_currentTextPart === 'before' || !_actionBlock || _actionsProcessed ? renderedMainContent : null}
        {renderedActionBlock}
        {_currentTextPart === 'after' && _actionsProcessed ? renderedMainContent : null}
        {showTypingCursor &&
         <span key={`${messageId}-cursor`} className="inline-block h-4 w-1 bg-primary animate-blink ml-0.5"></span>}
      </div>
    );
  }, [copiedId, highlighter, selectedShikiTheme, enableCopy, onCopyToClipboard, typingSpeed, typingStates]);

  return (
    <>
      <ScrollArea className="flex-1 p-3" ref={chatContainerRef}>
        {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "p-3 rounded-lg mb-3",
                message.role === "user"
                  ? "bg-muted/40 ml-4"
                  : "bg-muted/20 mr-4"
              )}
            >
              <div className="flex items-center mb-1">
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4 mr-1 text-primary" />
                ) : (
                  <User className="h-4 w-4 mr-1 text-primary" />
                )}
                <span className="text-xs text-muted-foreground">
                  {message.role === "assistant" ? "CodeForge" : "You"} •{" "}
                  {isClient ? (
                    message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  ) : (
                    <span style={{ display: 'inline-block', width: '45px' }}>&nbsp;</span>
                  )}
                </span>
                {message.role === "assistant" &&
                  !message.isTyping &&
                  message.content && 
                  !message.actionBlock && // Only show copy for simple text messages
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 ml-auto opacity-70 hover:opacity-100"
                      onClick={() =>
                        onCopyToClipboard(message.content!, message.id)
                      }
                      title="Copy message"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  }
              </div>
              <div className="pl-5 text-sm">
                {formatMessageContent(message)}
              </div>
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="p-3 border-t border-border mt-auto shrink-0">
        <div className="flex flex-col space-y-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={onKeyDown}
            placeholder={
              activeApiKey && selectedModel
                ? "Ask CodeForge anything..."
                : "Set API Key and select model in Settings to chat."
            }
            className="min-h-[60px] max-h-[150px] resize-none"
            rows={1}
            disabled={!activeApiKey || !selectedModel || isAISending || messages.some(m => m.actionBlock && m.actionBlock.steps.some(s => s.currentStatus === 'pending'))}
          />
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              { (isAISending || messages.some(m => m.role === 'assistant' && m.isTyping) || messages.some(m => m.actionBlock && m.actionBlock.steps.some(s => s.currentStatus === 'pending'))) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStopGenerating}
                  className="flex items-center text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Stop generating response / actions"
                >
                  <Square className="h-3.5 w-3.5 mr-1.5" />
                  Stop
                </Button>
              ) : (
                <>
                <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Insert code snippet (coming soon)"
                disabled
              >
                <Code className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Upload file (coming soon)"
                disabled
              >
                <FileCode className="h-4 w-4" />
              </Button>
                </>
              )}
            </div>
            <Button
              onClick={onSendMessage}
              disabled={
                !inputValue.trim() ||
                isAISending ||
                !activeApiKey ||
                !selectedModel ||
                messages.some((m) => m.role === 'assistant' && m.isTyping) ||
                messages.some(m => m.actionBlock && m.actionBlock.steps.some(s => s.currentStatus === 'pending'))
              }
              className="flex items-center"
            >
              {isAISending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isAISending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};