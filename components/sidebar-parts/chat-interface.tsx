// components/sidebar-parts/chat-interface.tsx
"use client";
import { AlertTriangle, CheckCircle2, Info, Loader2, Square, Terminal as TerminalIconLucide, PlayCircle, Search, Eye, Code as CodeIconLucide } from "lucide-react";
import React, { useRef, useCallback, useEffect, useState } from "react";
import { ScrollArea, Textarea, Button } from "@/components/ui"; // Consolidated imports
import { Send, Bot, User, Copy, Check, Code as CodeBlockIcon, FileCode } from "lucide-react"; // Renamed Code to CodeBlockIcon to avoid conflict
import { cn, debounce } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Highlighter, Lang, Theme as ShikiTheme } from 'shiki';
import { liveHighlightStrings, convertAsciiTableToMarkdown, liveHighlightMath } from '@/lib/markdown-utils';
import { escapeHtml } from '@/lib/html-utils';
import { toast } from "sonner";


export interface AiActionStep {
  type: "runCommand" | "startApplication" | "searchGoogle";
  description: string;
  command?: string;
  commandDisplay?: string;
  query?: string; // For searchGoogle
  // --- Fields for UI state, not from AI ---
  id: string; // Client-generated unique ID for the step instance
  currentStatus: 'idle' | 'pending' | 'success' | 'error';
  output?: string; // For command output or search results
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
  _isSearchResultContext?: boolean; 
}

export interface TypingState {
  charIndex: number;
}

interface HighlightedCodeBlockProps {
  code: string;
  language: string; // This will be the full language string e.g. "html-live-preview" or "python"
  highlighter: Highlighter | null;
  codeBlockTheme: ShikiTheme;
  // isLivePreviewBlock prop is removed as this component won't manage the iframe directly
}

const HighlightedCodeBlock: React.FC<HighlightedCodeBlockProps> = React.memo(({
  code,
  language, // e.g., "html-live-preview" or "python"
  highlighter,
  codeBlockTheme,
}) => {
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
        // For 'html-live-preview', we still want to show HTML syntax highlighting
        const langForShiki = (language === 'html-live-preview' ? 'html' : language?.toLowerCase()) as Lang || 'plaintext';
        
        const loadedLanguages = highlighter.getLoadedLanguages();
        const isPotentiallyComplete = langForShiki.length >=1 && (loadedLanguages.includes(langForShiki) || langForShiki.length >=2 || knownShortLangs.includes(langForShiki));

        if (!loadedLanguages.includes(langForShiki) && isPotentiallyComplete) {
          if (isMounted) setIsLoadingLanguage(true);
          try {
            const resolvedLang = highlighter.getLang(langForShiki);
            if (resolvedLang && loadedLanguages.includes(resolvedLang.id as Lang)) {
                 const html = highlighter.codeToHtml(code, { lang: resolvedLang.id as Lang, theme: codeBlockTheme });
                 if (isMounted) setHighlightedHtml(html);
            } else {
                await highlighter.loadLanguage(langForShiki);
                if (isMounted && highlighter.getLoadedLanguages().includes(langForShiki)) {
                  const html = highlighter.codeToHtml(code, { lang: langForShiki, theme: codeBlockTheme });
                  if (isMounted) setHighlightedHtml(html);
                } else if (isMounted) {
                  console.warn(`Shiki: Language "${langForShiki}" could not be loaded or is not recognized after attempt. Falling back.`);
                  setHighlightedHtml(`<pre class="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre>`);
                }
            }
          } catch (loadErr) {
            if (isMounted) setHighlightedHtml(`<pre class="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre>`);
          } finally {
            if (isMounted) setIsLoadingLanguage(false);
          }
        } else if (loadedLanguages.includes(langForShiki)) {
          const html = highlighter.codeToHtml(code, { lang: langForShiki, theme: codeBlockTheme });
          if (isMounted) setHighlightedHtml(html);
          if (isMounted) setIsLoadingLanguage(false);
        } else {
          if (isMounted) {
            setHighlightedHtml(`<pre class="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre>`);
            setIsLoadingLanguage(false);
          }
        }
      } else { // Fallback if no highlighter
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
    return <div className="shiki-container"><pre className="shiki-fallback p-2 text-xs"><code>Loading syntax for "{language === 'html-live-preview' ? 'html' : language}"...</code></pre></div>;
  }

  if (!code) return null;
  
  const codeToRender = (!highlighter && code) || (!highlightedHtml && code && !isLoadingLanguage)
    ? `<pre class="shiki-fallback"><code>${liveHighlightStrings(escapeHtml(code))}</code></pre>`
    : highlightedHtml;

  return <div className="shiki-container" dangerouslySetInnerHTML={{ __html: codeToRender }} />;
});
HighlightedCodeBlock.displayName = 'HighlightedCodeBlock';


interface ChatInterfaceProps {
  messages: MessageType[];
  setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (isReprompt?: boolean, repromptHistory?: any[]) => Promise<void>;
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
  onAiExecuteTerminalCommand: (command: string) => Promise<{ success: boolean; output: string }>;
  onRefreshFileTree: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  setMessages,
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
  onRefreshFileTree,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isClient, setIsClient] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null); 
  const viewportRef = useRef<HTMLDivElement | null>(null); 
  const isUserScrolledUpRef = useRef(false);
  const [currentProcessingStepVisual, setCurrentProcessingStepVisual] = useState<{ messageId: string; stepId: string } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      const viewportElement = chatContainerRef.current.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
      if (viewportElement) {
        viewportRef.current = viewportElement;
        const handleScroll = () => {
          if (viewportRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
            isUserScrolledUpRef.current = scrollHeight > clientHeight && scrollHeight - scrollTop - clientHeight > 30;
          }
        };
        viewportElement.addEventListener('scroll', handleScroll);
        return () => {
          if (viewportElement) { 
            viewportElement.removeEventListener('scroll', handleScroll);
          }
        }
      }
    }
  }, []); 

  useEffect(() => {
    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
      if (messagesEndRef.current && viewportRef.current && !isUserScrolledUpRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior });
      }
    };
    const debouncedSmoothScroll = debounce(scrollToBottom, 100);
    debouncedSmoothScroll();
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && (lastMessage.role === 'user' || (lastMessage.role === 'assistant' && lastMessage.isTyping && lastMessage.content === ""))) {
      if (messagesEndRef.current && viewportRef.current) {
        isUserScrolledUpRef.current = false; 
        setTimeout(() => { 
            if (messagesEndRef.current) {
                 messagesEndRef.current.scrollIntoView({ behavior: "auto" });
            }
        }, 0);
      }
    }
  }, [messages]);


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
      case 'runCommand':
        return <TerminalIconLucide className="ai-action-step-icon" />;
      case 'searchGoogle':
        return <Search className="ai-action-step-icon" />;
      case 'startApplication':
        return <PlayCircle className="ai-action-step-icon" />;
      default:
        return <Info className="ai-action-step-icon" />;
    }
  };

  const rePromptAIWithSearchResults = useCallback(async (originalUserQueryId: string, searchResultsText: string, originalAiMessageId: string) => {
    let originalUserMessageIndex = messages.findIndex(msg => msg.id === originalAiMessageId) -1;
    while(originalUserMessageIndex >= 0 && messages[originalUserMessageIndex].role !== 'user') {
        originalUserMessageIndex--;
    }
    const originalUserMessage = originalUserMessageIndex >= 0 ? messages[originalUserMessageIndex] : null;

    if (!originalUserMessage) {
      console.error("Could not find original user message for re-prompting with search results.");
      toast.error("Internal error: Could not process search results effectively.");
      setMessages(prev => prev.map(msg => msg.id === originalAiMessageId ? { ...msg, isTyping: false, _actionsProcessed: true, content: msg.content + "\n\n[Error: Could not re-prompt with search results]" } : msg));
      return;
    }

    const searchContextContent = `CONTEXT FROM PREVIOUS SEARCH (for your query: "${originalUserMessage.content}"):\n${searchResultsText}\n\nBased on this information, please provide your answer to my original request.`;

    const historyForReprompt = messages
      .slice(0, originalUserMessageIndex + 1) 
      .filter(msg => !(msg.role === 'assistant' && msg.content.startsWith("Hello! I'm CodeForge") && messages.length <=2))
      .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && !msg.isTyping && !msg.actionBlock && !msg._isSearchResultContext))
      .map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));
    
    const repromptWithContextHistory = [...historyForReprompt, { role: 'user' as const, parts: [{ text: searchContextContent }] }];

    setMessages(prev => prev.map(msg =>
      msg.id === originalAiMessageId ? {
        ...msg,
        content: (msg._mainContentBefore || "") + "\n\nProcessing search results...", 
        isTyping: true, 
        _currentTextPart: 'after', 
        _mainContentBefore: (msg._mainContentBefore || "") + "\n\nProcessing search results...",
        _mainContentAfter: "", 
        actionBlock: { 
            ...msg.actionBlock!,
            steps: msg.actionBlock!.steps.map(s => s.type === 'searchGoogle' && s.currentStatus === 'success' ? s : {...s, currentStatus: s.currentStatus === 'pending' ? 'idle' : s.currentStatus})
        }
      } : msg
    ));
    
    await onSendMessage(true, repromptWithContextHistory);

  }, [messages, onSendMessage, setMessages]);

  const processActionsSequentially = useCallback(async (messageId: string, actionBlock: AiActionBlock) => {
    let searchStepProcessedSuccessfully = false;
    let searchResultsOutput = "";

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
          case 'searchGoogle':
            if (step.query) {
              const searchApiResp = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: step.query }),
              });
              const searchData = await searchApiResp.json();
              success = searchApiResp.ok && !searchData.error;
              stepOutput = success ? `Search for "${step.query}" returned ${searchData.results?.length || 0} results.\n\n${searchData.results?.map((r: any) => `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}`).join('\n\n---\n\n') || 'No items found.'}` : (searchData.error || "Search request failed.");
              if (!success) stepErrorMessage = searchData.error || "Search request failed.";
              else {
                searchStepProcessedSuccessfully = true;
                searchResultsOutput = stepOutput;
              }
            } else {
              throw new Error("Missing query for searchGoogle action.");
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

      if (!success) {
          toast.error(`Action "${step.description}" failed: ${stepErrorMessage}`);
          setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, _actionsProcessed: true, isTyping: false } : msg));
          setCurrentProcessingStepVisual(null);
          return; 
      }
      if (step.type === 'searchGoogle' && success) {
          break; 
      }
    }
    setCurrentProcessingStepVisual(null);

    if (searchStepProcessedSuccessfully) {
      await rePromptAIWithSearchResults(messageId, searchResultsOutput, messageId);
    } else {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const shouldTypeAfter = !!msg._mainContentAfter;
          return {
            ...msg,
            _actionsProcessed: true,
            content: shouldTypeAfter ? "" : msg.content,
            isTyping: shouldTypeAfter,
            _currentTextPart: shouldTypeAfter ? 'after' : msg._currentTextPart,
            _mainContentBefore: shouldTypeAfter ? msg._mainContentAfter : msg._mainContentBefore,
            _mainContentAfter: shouldTypeAfter ? "" : msg._mainContentAfter,
          };
        }
        return msg;
      }));
    }
  }, [onAiExecuteTerminalCommand, onRefreshFileTree, setMessages, typingSpeed, rePromptAIWithSearchResults]);


  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.isTyping && lastMessage.actionBlock && !lastMessage._actionsProcessed) {
      processActionsSequentially(lastMessage.id, lastMessage.actionBlock);
    }
  }, [messages, processActionsSequentially]);


  const renderActionBlock = (messageId: string, actionBlock: AiActionBlock) => {
    return (
      <div className="ai-action-progress-bar-container">
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
                {step.type === 'searchGoogle' && step.query && (
                     <div className="ai-action-command-box">
                        Search Query: "{step.query}"
                     </div>
                )}
                {step.currentStatus === 'error' && step.errorMessage && (
                  <p className="ai-action-error-message">{step.errorMessage}</p>
                )}
                 {step.currentStatus === 'success' && step.output && (step.type === 'runCommand' || step.type === 'searchGoogle') && (
                  <pre className="ai-action-command-box mt-1.5 !bg-background/50 max-h-20 overflow-y-auto text-xs">
                    {step.output.length > 300 ? step.output.substring(0, 300) + "..." : step.output}
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
    const {
      id: messageId,
      content,
      actionBlock,
      isTyping,
      _currentTextPart,
      _mainContentBefore,
      _mainContentAfter,
      _actionsProcessed
    } = message;

    let textToDisplay = content; 

    const renderMarkdown = (text: string | undefined) => {
      if (!text) return null;
      let processedText = text;
      
      if (isTyping) {
        processedText = liveHighlightMath(processedText); 
        processedText = liveHighlightStrings(processedText); 
      }
      
      let markdownInput = text; 
      if (text.includes('|') || text.includes('+--')) {
        markdownInput = convertAsciiTableToMarkdown(text);
      }
      
      const textForReactMarkdown = isTyping ? processedText : markdownInput;

      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]} 
          rehypePlugins={[rehypeKatex, rehypeRaw]} // Always include rehypeRaw for HTML/JS/CSS
          components={{
            p: ({node, ...props}) => {
              return <p {...props} />;
            },
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+(?:-live-preview)?)/.exec(className || '');
              const codeContent = String(children).replace(/\n$/, '');

              // eslint-disable-next-line react-hooks/rules-of-hooks
              const [isPreviewActive, setIsPreviewActive] = useState(false); // Local state for this block's preview

              if (!inline && match) {
                const fullLanguage = match[1];
                const isLivePreviewBlock = fullLanguage === 'html-live-preview';
                const displayLanguage = isLivePreviewBlock ? 'html' : fullLanguage;
                
                const codeBlockId = `${messageId}-code-${node?.position?.start.offset || Math.random()}`;
                
                return (
                  <div className="ai-chat-code-block relative my-3 rounded-md group/codeblock">
                    <div className="ai-chat-code-block-header"> 
                      <span>{displayLanguage}</span>
                      <div className="flex items-center">
                        {isLivePreviewBlock && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-70 group-hover/codeblock:opacity-100 transition-opacity mr-1"
                            onClick={() => setIsPreviewActive(!isPreviewActive)}
                            title={isPreviewActive ? "Show Code" : "Show Live Preview"}
                          >
                            {isPreviewActive ? <CodeIconLucide className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        )}
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
                    </div>
                    {!isPreviewActive && ( // Only show Shiki highlighted code if preview is NOT active
                        <HighlightedCodeBlock
                        code={codeContent}
                        language={fullLanguage} 
                        highlighter={highlighter}
                        codeBlockTheme={selectedShikiTheme}
                        />
                    )}
                     {isLivePreviewBlock && isPreviewActive && (
                        <div className="live-preview-iframe-container relative mt-1" style={{ height: '250px', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'hsl(var(--background))' }}>
                            <iframe
                            srcDoc={codeContent} 
                            title="Live Code Preview"
                            sandbox="allow-scripts" // Be cautious with this in production
                            className="w-full h-full border-none"
                            />
                        </div>
                    )}
                  </div>
                );
              }
              // Handle inline code, potentially with live highlighting if needed
              if (inline && typeof children === 'string' && (children.includes('live-string') || children.includes('live-math'))) {
                return <code className={cn("not-prose", className)} {...props} dangerouslySetInnerHTML={{ __html: children }} />;
              }
              return (
                <code className={cn("not-prose", className)} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {textForReactMarkdown}
        </ReactMarkdown>
      );
    };
    
    const renderedMainContent = textToDisplay || (_currentTextPart === 'before' && _mainContentBefore) || (_currentTextPart === 'after' && _mainContentAfter) ? renderMarkdown(textToDisplay) : null;
    const shouldRenderActionBlock = actionBlock && (!_actionsProcessed || ( _actionsProcessed && !_mainContentAfter && _currentTextPart !== 'after'));
    const renderedActionBlock = shouldRenderActionBlock ? renderActionBlock(messageId, actionBlock) : null;

    const textBeingFullyTyped = _currentTextPart === 'before' ? _mainContentBefore : _mainContentAfter;
    const showTypingCursor = isTyping && textToDisplay.length < (textBeingFullyTyped || "").length && typingSpeed > 0;


    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1">
        {_currentTextPart === 'before' || !actionBlock || _actionsProcessed ? renderedMainContent : null}
        {renderedActionBlock}
        {_currentTextPart === 'after' && _actionsProcessed ? renderedMainContent : null}
        {showTypingCursor &&
         <span key={`${messageId}-cursor`} className="inline-block h-4 w-1 bg-primary animate-blink ml-0.5"></span>}
      </div>
    );
  }, [copiedId, highlighter, selectedShikiTheme, enableCopy, onCopyToClipboard, typingSpeed, currentProcessingStepVisual]);

  return (
    <>
      <ScrollArea className="flex-1 p-3 min-h-0" ref={chatContainerRef}> 
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
                  !message.actionBlock &&
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
                <CodeBlockIcon className="h-4 w-4" />
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
              onClick={() => onSendMessage()} 
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