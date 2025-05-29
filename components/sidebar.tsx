// components/sidebar.tsx
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, Button, Switch, Label } from "@/components/ui"; // Consolidated imports
import { Bot, Sparkles, Trash, Settings, Palette, MonitorPlay, Terminal as TerminalLucideIcon, Sun, Moon, Laptop, AlertCircle, ShieldCheck, ShieldOff, Search as SearchIconLucide } from "lucide-react";
import { toast } from "sonner";
import { getHighlighter, type Highlighter, type BundledTheme } from 'shiki';
import { useTheme } from "next-themes";
import { CODEFORGE_SYSTEM_PROMPT } from '@/lib/system-prompts';
import { editorThemesList, type EditorTheme } from '@/components/code-editor';
import { ChatTab } from './sidebar-parts/chat-tab';
import { SettingsTab } from './sidebar-parts/settings-tab';
import type { AiActionBlock, AiActionStep, MessageType } from './sidebar-parts/chat-interface';
import { generateId } from "@/lib/utils";


interface TypingState {
  charIndex: number;
}


export interface GeminiContent { // Exporting for use in ChatTab
  role: "user" | "model";
  parts: { text: string }[];
}

interface AiJsonResponse {
  project?: string | null;
  mainContentBefore?: string | null;
  steps?: Omit<AiActionStep, 'id' | 'currentStatus' | 'output' | 'errorMessage'>[] | null;
  mainContentAfter?: string | null;
  errorMessage?: string | null;
}


const shikiThemesListForSelect: { name: string; value: BundledTheme, type: 'light' | 'dark' }[] = [
  { name: "GitHub Dark", value: "github-dark", type: 'dark' },
  { name: "GitHub Light", value: "github-light", type: 'light' },
  { name: "Monokai", value: "monokai", type: 'dark' },
  { name: "Nord", value: "nord", type: 'dark' },
  { name: "Dracula", value: "dracula", type: 'dark' },
  { name: "One Dark Pro", value: "one-dark-pro", type: 'dark' },
  { name: "Solarized Light", value: "solarized-light", type: 'light' },
  { name: "Solarized Dark", value: "solarized-dark", type: 'dark' },
  { name: "Material Palenight", value: "material-theme-palenight", type: 'dark' },
  { name: "Min Dark", value: "min-dark", type: 'dark' },
  { name: "Min Light", value: "min-light", type: 'light' },
];

const terminalThemesListForSelect: { name: string; value: string }[] = [
    { name: "Default Dark", value: "dark" },
    { name: "Default Light", value: "light" },
    { name: "Ubuntu", value: "ubuntu" },
    { name: "PowerShell", value: "powershell" },
    { name: "CMD", value: "cmd" },
    { name: "Matrix", value: "matrix" },
];

interface SidebarProps {
  onRefreshFileTree: () => void;
  onAiOpenFileInEditor: (filePath: string) => Promise<void>;
  onAiExecuteTerminalCommand: (command: string) => Promise<{ success: boolean; output: string }>;
  setSelectedEditorTheme: React.Dispatch<React.SetStateAction<EditorTheme | undefined>>;
  setSelectedTerminalTheme: React.Dispatch<React.SetStateAction<string | undefined>>;
  currentEditorTheme?: EditorTheme;
  currentTerminalTheme?: string;
  isTerminalInputDisabled: boolean;
  setIsTerminalInputDisabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({
    onRefreshFileTree, onAiOpenFileInEditor, onAiExecuteTerminalCommand,
    setSelectedEditorTheme: setAppSelectedEditorTheme, setSelectedTerminalTheme: setAppSelectedTerminalTheme,
    currentEditorTheme: appCurrentEditorTheme, currentTerminalTheme: appCurrentTerminalTheme,
    isTerminalInputDisabled, setIsTerminalInputDisabled
}: SidebarProps) {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm CodeForge, your AI coding assistant. Please set your Gemini API key in settings to begin.",
      timestamp: new Date(),
      isTyping: false,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [apiKeyInputValue, setApiKeyInputValue] = useState("");
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [isVerifyingApiKey, setIsVerifyingApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isAISending, setIsAISending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [enableCopy] = useState(true);
  const [typingStates, setTypingStates] = useState<Record<string, TypingState>>({});
  const TYPING_SPEED = 1; 

  const stopGeneratingRef = useRef(false);

  const { theme: appTheme, setTheme: setAppTheme, resolvedTheme } = useTheme();

  const getInitialShikiTheme = useCallback((currentAppTheme?: string, currentResolvedTheme?: string) => {
    let themeModeToUse = 'dark';
    if (currentAppTheme && currentAppTheme !== 'system') {
        if (currentAppTheme === 'light' || currentAppTheme === 'sandstone') themeModeToUse = 'light';
        else if (currentAppTheme === 'dark' || currentAppTheme === 'midnight-blue') themeModeToUse = 'dark';
        else if (currentResolvedTheme) themeModeToUse = currentResolvedTheme;
    } else if (currentResolvedTheme) {
        themeModeToUse = currentResolvedTheme;
    }
    return themeModeToUse === 'dark' ? 'github-dark' : 'github-light';
  }, []);

  const [selectedShikiTheme, setSelectedShikiTheme] = useState<BundledTheme>(getInitialShikiTheme(appTheme, resolvedTheme));


  const [selectedEditorThemeInternal, setSelectedEditorThemeInternal] = useState<EditorTheme | undefined>(
    appCurrentEditorTheme
  );
  const [selectedTerminalThemeInternal, setSelectedTerminalThemeInternal] = useState<string | undefined>(
    appCurrentTerminalTheme
  );

  useEffect(() => {
    let currentMode: 'light' | 'dark' = 'light';

    if (appTheme === 'system') {
      currentMode = resolvedTheme === 'dark' ? 'dark' : 'light';
    } else if (appTheme === 'light' || appTheme === 'sandstone') {
      currentMode = 'light';
    } else if (appTheme === 'dark' || appTheme === 'midnight-blue') {
      currentMode = 'dark';
    } else if (resolvedTheme) {
        currentMode = resolvedTheme as 'light' | 'dark';
    }

    const currentShikiThemeInfo = shikiThemesListForSelect.find(t => t.value === selectedShikiTheme);
    if (currentShikiThemeInfo?.type !== currentMode) {
      setSelectedShikiTheme(currentMode === 'dark' ? 'github-dark' : 'github-light');
    }

    const newEditorTheme: EditorTheme = currentMode === 'dark' ? 'vs-dark' : 'vs';
    if (selectedEditorThemeInternal !== newEditorTheme) {
      setSelectedEditorThemeInternal(newEditorTheme);
      if (setAppSelectedEditorTheme) setAppSelectedEditorTheme(newEditorTheme);
    }
    
    const newTerminalTheme = currentMode === 'dark' ? 'dark' : 'light';
    if (selectedTerminalThemeInternal !== newTerminalTheme) {
      setSelectedTerminalThemeInternal(newTerminalTheme);
      if (setAppSelectedTerminalTheme) setAppSelectedTerminalTheme(newTerminalTheme);
    }
  }, [appTheme, resolvedTheme, selectedShikiTheme, selectedEditorThemeInternal, selectedTerminalThemeInternal, setAppSelectedEditorTheme, setAppSelectedTerminalTheme]);


  useEffect(() => {
    let isMounted = true;
    async function initShiki() {
      try {
        const shikiHighlighter = await getHighlighter({
          themes: shikiThemesListForSelect.map(t => t.value),
          langs: [
            'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'jsx', 'tsx',
            'html', 'css', 'json', 'yaml', 'markdown', 'md', 'bash', 'shell', 'sh',
            'java', 'csharp', 'cs', 'cpp', 'c', 'go', 'rust', 'php', 'ruby', 'sql',
            'plaintext', 'text'
          ],
        });
        if (isMounted) setHighlighter(shikiHighlighter);
      } catch (error) {
        console.error("Failed to initialize Shiki highlighter:", error);
        if (isMounted) toast.error("Code syntax highlighter failed to load.");
      }
    }
    initShiki();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let activeIntervals: NodeJS.Timeout[] = [];
    messages.forEach(message => {
      if (message.isTyping && message.role === 'assistant') {
        const textToType = message._currentTextPart === 'before' ? message._mainContentBefore : message._mainContentAfter;

        if (!textToType) {
          setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id ? { ...m, isTyping: false } : m));
          setTypingStates(prev => {
            const newStates = {...prev};
            if (newStates[message.id]) delete newStates[message.id];
            return newStates;
          });
          return;
        }

        const intervalId = setInterval(() => {
          if (stopGeneratingRef.current && message.id === messages.find(m => m.isTyping && m.role === 'assistant')?.id) {
            clearInterval(intervalId);
            setMessages(prevMsgs => prevMsgs.map(m => {
                if (m.id === message.id) {
                    const currentProgress = typingStates[m.id]?.charIndex || 0;
                    const fullText = m._currentTextPart === 'before' ? m._mainContentBefore : m._mainContentAfter;
                    return { ...m, isTyping: false, content: (fullText || "").substring(0, currentProgress) + " [Stopped]" };
                }
                return m;
            }));
            setTypingStates(prev => {
                const newStates = {...prev};
                if (newStates[message.id]) delete newStates[message.id];
                return newStates;
            });
            return;
          }

          setTypingStates(currentStates => {
            const stateForMessage = currentStates[message.id] || { charIndex: 0 };
            let newCharIndex = stateForMessage.charIndex;

            const currentMessageBeingTyped = messages.find(m => m.id === message.id);
            const currentTextToType = currentMessageBeingTyped
              ? (currentMessageBeingTyped._currentTextPart === 'before' ? currentMessageBeingTyped._mainContentBefore : currentMessageBeingTyped._mainContentAfter)
              : textToType;


            if (newCharIndex < (currentTextToType || "").length) {
              newCharIndex++;
              const newDisplayedText = (currentTextToType || "").substring(0, newCharIndex);
              const isFinished = newCharIndex >= (currentTextToType || "").length;

              setMessages(prevMsgs => prevMsgs.map(m =>
                  m.id === message.id ? { ...m, content: newDisplayedText, isTyping: !isFinished } : m
              ));

              if (isFinished) {
                clearInterval(intervalId);
                const nextTypingStates = { ...currentStates };
                delete nextTypingStates[message.id];
                return nextTypingStates;
              }
              return { ...currentStates, [message.id]: { charIndex: newCharIndex } };
            } else {
              clearInterval(intervalId);
              setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id && m.isTyping ? { ...m, isTyping: false } : m));
              const nextTypingStates = { ...currentStates };
              delete nextTypingStates[message.id];
              return nextTypingStates;
            }
          });
        }, TYPING_SPEED);
        activeIntervals.push(intervalId);
      } else if (!message.isTyping && typingStates[message.id]) {
         setTypingStates(prev => {
             const newStates = {...prev};
             if (newStates[message.id]) delete newStates[message.id];
             return newStates;
         });
      }
    });

    if (stopGeneratingRef.current && !messages.some(m => m.isTyping && m.role === 'assistant')) {
        stopGeneratingRef.current = false;
    }

    return () => { activeIntervals.forEach(clearInterval); };
  }, [messages, TYPING_SPEED, setMessages, setTypingStates, stopGeneratingRef]);


  const handleVerifyApiKey = useCallback(async () => {
    if (!apiKeyInputValue.trim()) { toast.error("API Key cannot be empty."); return; }
    setIsVerifyingApiKey(true); setIsLoadingModels(true); setAvailableModels([]); setSelectedModel("");
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKeyInputValue.trim()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Failed to fetch models. Status: ${response.status}`);
      }
      const data = await response.json();
      const fetchedModels: GeminiModel[] = data.models
        .filter((model: any) => model.supportedGenerationMethods?.includes("generateContent"))
        .map((model: any) => ({ id: model.name, name: model.displayName || model.name }));

      if (fetchedModels.length === 0) {
        toast.warning("No suitable models (that support generateContent) found. Check key/permissions.", { duration: 5000 });
        setActiveApiKey(null);
      } else {
        setAvailableModels(fetchedModels); setActiveApiKey(apiKeyInputValue.trim());
        const flashModel = fetchedModels.find(m => m.id.includes('flash'));
        const proModel = fetchedModels.find(m => m.id.includes('pro') && !m.id.includes('vision'));

        if (flashModel) {
            setSelectedModel(flashModel.id);
        } else if (proModel) {
            setSelectedModel(proModel.id);
        } else {
            setSelectedModel(fetchedModels[0].id);
        }
        toast.success("API Key set and models loaded!");
      }
    } catch (error: any) {
      console.error("Error verifying API key:", error);
      toast.error(`Error: ${error.message || "Could not verify API key."}`, { duration: 7000 });
      setActiveApiKey(null); setAvailableModels([]);
    } finally {
      setIsVerifyingApiKey(false); setIsLoadingModels(false);
    }
  }, [apiKeyInputValue]);

  const handleSendMessage = useCallback(async (
    isReprompt: boolean = false,
    repromptHistoryWithContext?: GeminiContent[]
  ) => {
    if (!inputValue.trim() && !isReprompt) {
      toast.error("Message cannot be empty.");
      return;
    }
    if (!activeApiKey || !selectedModel) {
      if (!activeApiKey) toast.error("Set API Key in Settings.");
      if (!selectedModel && activeApiKey) toast.error("Select a model in Settings.");
      return;
    }
    stopGeneratingRef.current = false;
    const currentInput = inputValue;

    if (!isReprompt) {
      const newUserMessage: MessageType = { id: Date.now().toString(), role: "user", content: currentInput, timestamp: new Date(), isTyping: false };
      setMessages((prev) => [...prev, newUserMessage]);
      setInputValue("");
    }
    setIsAISending(true);

    const contentsForApi: GeminiContent[] = repromptHistoryWithContext
      ? repromptHistoryWithContext
      : [ 
          ...messages
            .filter(msg => !(msg.role === 'assistant' && msg.content.startsWith("Hello! I'm CodeForge") && messages.length <= 2))
            .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && !msg.isTyping && !msg.actionBlock && !msg._isSearchResultContext)) 
            .map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })),
          { role: 'user' as const, parts: [{ text: currentInput }] } 
        ];
    
    const apiRequestBody = {
      contents: contentsForApi,
      systemInstruction: { parts: [{ text: CODEFORGE_SYSTEM_PROMPT }] }
    };

    const aiMessageId = (Date.now() + 1).toString();
    const placeholderAiMessage: MessageType = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      actionBlock: null,
      timestamp: new Date(),
      isTyping: false, 
      _mainContentBefore: "",
      _mainContentAfter: "",
      _actionsProcessed: false,
      _currentTextPart: 'before',
    };
    setMessages((prev) => [...prev, placeholderAiMessage]);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${activeApiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(apiRequestBody),
      });

      let rawAiResponseText = "{\"mainContentBefore\": \"Sorry, I couldn't get a response.\", \"steps\": null, \"mainContentAfter\": null, \"errorMessage\": \"No content from API.\"}"
      if (response.ok) {
        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          rawAiResponseText = data.candidates[0].content.parts[0].text;
        } else if (data.promptFeedback?.blockReason) {
          rawAiResponseText = JSON.stringify({
            mainContentBefore: `Request blocked: ${data.promptFeedback.blockReason}. ${data.promptFeedback.blockReasonMessage || ''}`,
            steps: null,
            mainContentAfter: null,
            errorMessage: `Blocked: ${data.promptFeedback.blockReason}`
          });
          toast.warning(`Request blocked: ${data.promptFeedback.blockReason}`, { duration: 7000 });
        }
      } else {
         const errorData = await response.json().catch(() => ({}));
         rawAiResponseText = JSON.stringify({
            mainContentBefore: `API request failed. Status: ${response.status}. ${errorData?.error?.message || ''}`,
            steps: null,
            mainContentAfter: null,
            errorMessage: `API Error: ${response.status}`
         });
      }

      let parsedResponse: AiJsonResponse;
      let finalMainContentBefore = "";
      let finalActionBlock: AiActionBlock | null = null;
      let finalMainContentAfter = "";
      let jsonStringToParse = rawAiResponseText.trim(); 

      try {
        if (jsonStringToParse.startsWith("```json")) {
          jsonStringToParse = jsonStringToParse.substring(7);
        } else if (jsonStringToParse.startsWith("```")) {
           jsonStringToParse = jsonStringToParse.substring(3);
        }
        if (jsonStringToParse.endsWith("```")) {
          jsonStringToParse = jsonStringToParse.substring(0, jsonStringToParse.length - 3);
        }
        jsonStringToParse = jsonStringToParse.trim();

        parsedResponse = JSON.parse(jsonStringToParse);
        finalMainContentBefore = parsedResponse.mainContentBefore || "";
        if (parsedResponse.steps && parsedResponse.steps.length > 0) {
          finalActionBlock = {
            project: parsedResponse.project || undefined,
            steps: parsedResponse.steps.map(step => ({
              ...step,
              id: generateId(),
              currentStatus: 'idle',
            }))
          };
        }
        finalMainContentAfter = parsedResponse.mainContentAfter || "";

        if (parsedResponse.errorMessage) {
          finalMainContentBefore = `${finalMainContentBefore}${finalMainContentBefore ? '\n\n' : ''}**AI Error:** ${parsedResponse.errorMessage}`;
          toast.error(`AI reported an error: ${parsedResponse.errorMessage}`);
        }
      } catch (jsonParseError) {
        console.error("Failed to parse AI JSON response:", jsonParseError, "Raw response was:", rawAiResponseText, "Attempted to parse:", jsonStringToParse);
        finalMainContentBefore = `Error: AI response was not valid JSON.\n\nRaw response:\n\`\`\`text\n${rawAiResponseText}\n\`\`\``;
        toast.error("AI response was not valid JSON. Displaying raw output.");
      }

      if (stopGeneratingRef.current) {
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: (typingStates[aiMessageId] ? (msg._currentTextPart === 'before' ? msg._mainContentBefore : msg._mainContentAfter) : msg.content || "").substring(0, typingStates[aiMessageId]?.charIndex || 0) + " [Stopped by user]", actionBlock: null, isTyping: false, _actionsProcessed: true } : msg));
        setIsAISending(false);
        stopGeneratingRef.current = false;
        return;
      }

      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? {
          ...msg,
          content: "",
          actionBlock: finalActionBlock,
          isTyping: !!(finalMainContentBefore),
          _mainContentBefore: finalMainContentBefore,
          _mainContentAfter: finalMainContentAfter,
          _currentTextPart: 'before',
          _actionsProcessed: !finalActionBlock, 
        } : msg
      ));

      if (finalMainContentBefore && TYPING_SPEED > 0) {
        setTypingStates(prev => ({...prev, [aiMessageId]: { charIndex: 0 }}));
      } else if (!finalMainContentBefore && finalActionBlock) {
        // Action processing will be handled by ChatInterface's useEffect
      } else if (!finalMainContentBefore && !finalActionBlock && finalMainContentAfter) {
         setMessages(prev => prev.map(msg =>
            msg.id === aiMessageId ? {
            ...msg,
            content: "",
            isTyping: true,
            _currentTextPart: 'after',
            _mainContentBefore: finalMainContentAfter, 
            _mainContentAfter: "", 
            _actionsProcessed: true, 
            } : msg
        ));
        if (TYPING_SPEED > 0) {
            setTypingStates(prev => ({...prev, [aiMessageId]: { charIndex: 0 }}));
        }
      } else if (!finalMainContentBefore && !finalActionBlock && !finalMainContentAfter) {
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? {...msg, content: "[Empty Response]", isTyping: false, _actionsProcessed: true} : msg));
      }


    } catch (error: any) {
      console.error("Error sending message:", error);
      const errMsg = `Error: ${error.message || "Could not connect."}`;
      toast.error(errMsg, { duration: 7000 });
      setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: errMsg, isTyping: false, _actionsProcessed: true } : msg));
      setTypingStates(prev => { const n = {...prev}; delete n[aiMessageId]; return n; });
    } finally {
      setIsAISending(false);
    }
  }, [inputValue, activeApiKey, selectedModel, messages, TYPING_SPEED, setTypingStates, setMessages, setInputValue, setIsAISending]);

  const handleStopGenerating = useCallback(() => {
    stopGeneratingRef.current = true;
    setIsAISending(false);
    setMessages(prevMessages =>
      prevMessages.map(msg => {
        if (msg.role === 'assistant' && msg.isTyping) {
          return { ...msg, isTyping: false }; 
        }
        return msg;
      })
    );
    toast.info("AI response generation stopped.");
  }, [setMessages, setIsAISending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text); setCopiedId(id); toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };
  const clearChat = () => {
    setMessages([{ id: Date.now().toString(), role: "assistant", content: "Chat cleared. How can I help?", timestamp: new Date(), isTyping: false }]);
    toast.info("Chat cleared.");
  };

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground">
      <div className="border-b border-border p-3 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          AI Assistant
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-2 shrink-0">
          <TabsTrigger value="chat" className="flex items-center">
            <Sparkles className="mr-2 h-4 w-4" /> Chat
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <ChatTab
          messages={messages}
          setMessages={setMessages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onKeyDown={handleKeyDown}
          isAISending={isAISending}
          activeApiKey={activeApiKey}
          selectedModel={selectedModel}
          copiedId={copiedId}
          onCopyToClipboard={copyToClipboard}
          highlighter={highlighter}
          selectedShikiTheme={selectedShikiTheme}
          enableCopy={enableCopy}
          typingSpeed={TYPING_SPEED}
          onStopGenerating={handleStopGenerating}
          onAiOpenFileInEditor={onAiOpenFileInEditor}
          onAiExecuteTerminalCommand={onAiExecuteTerminalCommand}
          onRefreshFileTree={onRefreshFileTree}
        />

        <SettingsTab
          apiKeyInputValue={apiKeyInputValue}
          onApiKeyInputChange={setApiKeyInputValue}
          onVerifyApiKey={handleVerifyApiKey}
          isVerifyingApiKey={isVerifyingApiKey}
          activeApiKey={activeApiKey}
          availableModels={availableModels}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isLoadingModels={isLoadingModels}
          appTheme={appTheme}
          onAppThemeChange={(value) => { if (setAppTheme) setAppTheme(value); }}
          selectedShikiTheme={selectedShikiTheme}
          onShikiThemeChange={(value) => setSelectedShikiTheme(value as BundledTheme)}
          shikiThemesList={shikiThemesListForSelect.map(t => ({name: t.name, value: t.value}))}
          selectedEditorTheme={selectedEditorThemeInternal || (resolvedTheme === 'dark' ? 'vs-dark' : 'vs')}
          onEditorThemeChange={(value) => { setSelectedEditorThemeInternal(value as EditorTheme); if(setAppSelectedEditorTheme) setAppSelectedEditorTheme(value as EditorTheme);}}
          editorThemesList={editorThemesList}
          selectedTerminalTheme={selectedTerminalThemeInternal || (resolvedTheme === 'dark' ? 'dark' : 'light')}
          onTerminalThemeChange={(value) => { setSelectedTerminalThemeInternal(value); if(setAppSelectedTerminalTheme) setAppSelectedTerminalTheme(value);}}
          terminalThemesList={terminalThemesListForSelect}
          isTerminalInputDisabled={isTerminalInputDisabled}
          setIsTerminalInputDisabled={setIsTerminalInputDisabled}
        />
      </Tabs>
    </div>
  );
}