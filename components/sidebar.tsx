// components/sidebar.tsx
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Trash, Settings, Palette, MonitorPlay, Terminal as TerminalLucideIcon, Sun, Moon, Laptop, AlertCircle } from "lucide-react"
import { toast } from "sonner";
import { getHighlighter, type Highlighter, type BundledTheme } from 'shiki';
import { useTheme } from "next-themes";
import { CODEFORGE_SYSTEM_PROMPT } from '@/lib/system-prompts';
import { editorThemesList, type EditorTheme } from '@/components/code-editor';
import { ChatTab } from './sidebar-parts/chat-tab';
import { SettingsTab } from './sidebar-parts/settings-tab';
import type { AiActionBlock, AiActionStep } from './sidebar-parts/chat-interface'; 
import { generateId } from "@/lib/utils";


interface MessageType {
  id: string;
  role: "user" | "assistant";
  content: string; // For user messages, this is the direct input. For AI, this will be typed out (mainContentBefore, then mainContentAfter)
  actionBlock?: AiActionBlock | null;
  timestamp: Date;
  isTyping?: boolean; // True when the 'content' field is being typed out
  
  // Internal state for managing multi-part AI responses
  _mainContentBefore?: string; // Stores the initial text part from AI JSON
  _mainContentAfter?: string;  // Stores the final text part from AI JSON
  _actionsProcessed?: boolean; // Flag: true if actionBlock has been processed
  _currentTextPart?: 'before' | 'after'; // Indicates which part is currently being typed or should be typed next
}

interface TypingState {
  displayedText: string;
  charIndex: number;
}


interface GeminiModel {
  id: string;
  name: string;
}
interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

// AI JSON response structure (matching the system prompt)
interface AiJsonResponse {
  project?: string | null;
  mainContentBefore?: string | null;
  steps?: Omit<AiActionStep, 'id' | 'currentStatus' | 'output' | 'errorMessage'>[] | null; // Steps from AI don't have client-side state yet
  mainContentAfter?: string | null;
  errorMessage?: string | null;
}


const shikiThemesListForSelect: { name: string; value: BundledTheme }[] = [
  { name: "GitHub Dark", value: "github-dark" },
  { name: "GitHub Light", value: "github-light" },
  { name: "Monokai", value: "monokai" },
  { name: "Nord", value: "nord" },
  { name: "Dracula", value: "dracula" },
  { name: "One Dark Pro", value: "one-dark-pro" },
  { name: "Solarized Light", value: "solarized-light" },
  { name: "Solarized Dark", value: "solarized-dark" },
  { name: "Material Palenight", value: "material-theme-palenight" },
  { name: "Min Dark", value: "min-dark" },
  { name: "Min Light", value: "min-light" },
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
  onAiCreateFileAndType: (filePath: string, content: string) => Promise<void>;
  setSelectedEditorTheme: React.Dispatch<React.SetStateAction<EditorTheme | undefined>>;
  setSelectedTerminalTheme: React.Dispatch<React.SetStateAction<string | undefined>>;
  currentEditorTheme?: EditorTheme;
  currentTerminalTheme?: string;
}

export default function Sidebar({ 
    onRefreshFileTree, onAiOpenFileInEditor, onAiExecuteTerminalCommand, onAiCreateFileAndType,
    setSelectedEditorTheme: setAppSelectedEditorTheme, setSelectedTerminalTheme: setAppSelectedTerminalTheme,
    currentEditorTheme: appCurrentEditorTheme, currentTerminalTheme: appCurrentTerminalTheme
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

  const { theme: appTheme, setTheme: setAppTheme } = useTheme();

  const [selectedShikiTheme, setSelectedShikiTheme] = useState<BundledTheme>(
    (appCurrentEditorTheme === 'vs' || appCurrentEditorTheme === 'hc-light' ? 'github-light' : 'github-dark') as BundledTheme
  );
  const [selectedEditorThemeInternal, setSelectedEditorThemeInternal] = useState<EditorTheme | undefined>(
    appCurrentEditorTheme
  );
  const [selectedTerminalThemeInternal, setSelectedTerminalThemeInternal] = useState<string | undefined>(
    appCurrentTerminalTheme
  );

  useEffect(() => {
    const defaultEditorTheme: EditorTheme = appTheme === 'dark' || appTheme === 'system' ? 'vs-dark' : 'vs';
    const defaultTerminalTheme = appTheme === 'dark' || appTheme === 'system' ? 'dark' : 'light';
    const defaultShikiTheme: BundledTheme = appTheme === 'dark' || appTheme === 'system' ? 'github-dark' : 'github-light';

    if (!editorThemesList.find(t => t.value === selectedEditorThemeInternal)) {
        setSelectedEditorThemeInternal(defaultEditorTheme);
    }
    if (!terminalThemesListForSelect.find(t => t.value === selectedTerminalThemeInternal)) {
        setSelectedTerminalThemeInternal(defaultTerminalTheme);
    }
    if (!shikiThemesListForSelect.find(t => t.value === selectedShikiTheme)) {
        setSelectedShikiTheme(defaultShikiTheme);
    }
  }, [appTheme, selectedEditorThemeInternal, selectedTerminalThemeInternal, selectedShikiTheme]);

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
        if (!textToType) { // If no text for current part, mark as not typing
          setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id ? { ...m, isTyping: false } : m));
          return;
        }

        if (stopGeneratingRef.current && message.id === messages.find(m => m.isTyping && m.role === 'assistant')?.id) {
            setTypingStates(prev => {
                const newStates = {...prev};
                delete newStates[message.id];
                return newStates;
            });
            setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id ? { ...m, isTyping: false, content: (typingStates[message.id]?.displayedText || message.content) + " [Stopped]" } : m));
            stopGeneratingRef.current = false; 
            return; 
        }

        const currentTypingState = typingStates[message.id] || { displayedText: "", charIndex: 0 };
        if (currentTypingState.charIndex < textToType.length) {
          const intervalDelay = Math.max(1, TYPING_SPEED);
          const intervalId = setInterval(() => {
            setTypingStates(prevTypingStates => {
              const state = prevTypingStates[message.id];
              if (!state || (stopGeneratingRef.current && message.id === messages.find(m => m.isTyping && m.role === 'assistant')?.id)) {
                clearInterval(intervalId);
                 if (stopGeneratingRef.current && state) { 
                    setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id ? { ...m, isTyping: false, content: state.displayedText + " [Stopped]" } : m));
                 }
                const newStates = { ...prevTypingStates };
                delete newStates[message.id];
                if(stopGeneratingRef.current) stopGeneratingRef.current = false;
                return newStates;
              }

              if (state.charIndex < textToType.length) {
                const newCharIndex = state.charIndex + 1;
                const newDisplayedText = textToType.substring(0, newCharIndex);
                const isFinished = newCharIndex >= textToType.length;
                
                setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id ? { ...m, content: newDisplayedText, isTyping: !isFinished } : m));

                if (isFinished) {
                  clearInterval(intervalId);
                  const newStates = { ...prevTypingStates };
                  delete newStates[message.id];
                  return newStates;
                }
                return { ...prevTypingStates, [message.id]: { displayedText: newDisplayedText, charIndex: newCharIndex } };
              } else { 
                clearInterval(intervalId);
                setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id && m.isTyping ? { ...m, isTyping: false } : m));
                const newStates = { ...prevTypingStates };
                delete newStates[message.id];
                return newStates;
              }
            });
          }, intervalDelay);
          activeIntervals.push(intervalId);
        } else if (currentTypingState.charIndex >= textToType.length && textToType.length > 0) {
           setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id ? { ...m, isTyping: false } : m));
           setTypingStates(prev => { const newStates = {...prev}; delete newStates[message.id]; return newStates; });
        }
      } else if (!message.isTyping && typingStates[message.id]) {
        setTypingStates(prev => { const newStates = {...prev}; delete newStates[message.id]; return newStates; });
      }
    });
    return () => { activeIntervals.forEach(clearInterval); };
  }, [messages, TYPING_SPEED]); // Removed typingStates from deps to avoid re-triggering on its own update

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

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !activeApiKey || !selectedModel) {
      if(!activeApiKey) toast.error("Set API Key in Settings.");
      if(!selectedModel && activeApiKey) toast.error("Select a model in Settings.");
      return;
    }
    stopGeneratingRef.current = false;
    const newUserMessage: MessageType = { id: Date.now().toString(), role: "user", content: inputValue, timestamp: new Date(), isTyping: false };
    setMessages((prev) => [...prev, newUserMessage]);
    const currentInput = inputValue; setInputValue(""); setIsAISending(true);

    const uiConversationHistory: GeminiContent[] = messages
      .filter(msg => !(msg.role === 'assistant' && msg.content.startsWith("Hello! I'm CodeForge") && messages.length <=2))
      .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && !msg.isTyping && !msg.actionBlock)) // Exclude messages with action blocks that are being processed or were just placeholders
      .map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));

    const apiRequestBody = { contents: [...uiConversationHistory, { role: 'user' as const, parts: [{ text: currentInput }] }], systemInstruction: { parts: [{ text: CODEFORGE_SYSTEM_PROMPT }] } };
    
    const aiMessageId = (Date.now() + 1).toString();
    // Initial placeholder for the AI message
    const placeholderAiMessage: MessageType = { 
      id: aiMessageId, 
      role: "assistant", 
      content: "", // Will be filled by typing animation
      actionBlock: null,
      timestamp: new Date(), 
      isTyping: false, // Will be set to true once content is ready to be typed
      _mainContentBefore: "",
      _mainContentAfter: "",
      _actionsProcessed: false,
      _currentTextPart: 'before',
    };
    setMessages((prev) => [...prev, placeholderAiMessage]);
    // No initial typing state here, it will be set when content is available

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

      try {
        parsedResponse = JSON.parse(rawAiResponseText);
        finalMainContentBefore = parsedResponse.mainContentBefore || "";
        if (parsedResponse.steps && parsedResponse.steps.length > 0) {
          finalActionBlock = { 
            project: parsedResponse.project || undefined,
            steps: parsedResponse.steps.map(step => ({
              ...step,
              id: generateId(), // Client-side unique ID for UI key and state tracking
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
        console.error("Failed to parse AI JSON response:", jsonParseError, "Raw response:", rawAiResponseText);
        finalMainContentBefore = `Error: AI response was not valid JSON.\n\nRaw response:\n\`\`\`text\n${rawAiResponseText}\n\`\`\``;
        toast.error("AI response was not valid JSON. Displaying raw output.");
      }

      if (stopGeneratingRef.current) {
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: (typingStates[aiMessageId]?.displayedText || msg.content) + " [Stopped by user]", actionBlock: null, isTyping: false, _actionsProcessed: true } : msg));
        setIsAISending(false);
        stopGeneratingRef.current = false;
        return;
      }

      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? { 
          ...msg, 
          content: "", // Start with empty content for typing
          actionBlock: finalActionBlock, 
          isTyping: !!(finalMainContentBefore), // Start typing if there's 'before' content
          _mainContentBefore: finalMainContentBefore,
          _mainContentAfter: finalMainContentAfter,
          _currentTextPart: 'before',
          _actionsProcessed: !finalActionBlock, // If no actions, mark as processed
        } : msg
      ));

      if (finalMainContentBefore && TYPING_SPEED > 0) {
        setTypingStates(prev => ({...prev, [aiMessageId]: { displayedText: "", charIndex: 0 }}));
      } else if (!finalMainContentBefore && finalActionBlock) {
        // If no 'before' content but there are actions, ChatInterface useEffect will pick it up
      } else if (!finalMainContentBefore && !finalActionBlock && finalMainContentAfter) {
        // No 'before' content, no actions, but 'after' content -> start typing 'after'
         setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId ? { 
            ...msg, 
            content: "",
            isTyping: true,
            _currentTextPart: 'after',
            _mainContentBefore: finalMainContentAfter, // Use _mainContentBefore to drive typing
            _mainContentAfter: "", 
            _actionsProcessed: true,
            } : msg
        ));
        if (TYPING_SPEED > 0) {
            setTypingStates(prev => ({...prev, [aiMessageId]: { displayedText: "", charIndex: 0 }}));
        }
      } else if (!finalMainContentBefore && !finalActionBlock && !finalMainContentAfter) {
        // Completely empty response from AI (after parsing)
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
  }, [inputValue, activeApiKey, selectedModel, messages, TYPING_SPEED]); // Added TYPING_SPEED

  const handleStopGenerating = useCallback(() => {
    stopGeneratingRef.current = true;
    setIsAISending(false); 
    
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.role === 'assistant' && msg.isTyping) {
          return { ...msg, isTyping: false, content: (typingStates[msg.id]?.displayedText || msg.content) + " [Stopped]" };
        }
        return msg;
      })
    );
    setTypingStates({});
    toast.info("AI response generation stopped.");
  }, [typingStates]);

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
          setMessages={setMessages} // Pass setMessages for action updates
          typingStates={typingStates}
          setTypingStates={setTypingStates} // Pass setTypingStates
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
          // Pass AI action handlers
          onAiOpenFileInEditor={onAiOpenFileInEditor}
          onAiExecuteTerminalCommand={onAiExecuteTerminalCommand}
          onAiCreateFileAndType={onAiCreateFileAndType}
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
          shikiThemesList={shikiThemesListForSelect}
          selectedEditorTheme={selectedEditorThemeInternal || (appTheme === 'dark' || appTheme === 'system' ? 'vs-dark' : 'vs')}
          onEditorThemeChange={(value) => { setSelectedEditorThemeInternal(value as EditorTheme); if(setAppSelectedEditorTheme) setAppSelectedEditorTheme(value as EditorTheme);}}
          editorThemesList={editorThemesList}
          selectedTerminalTheme={selectedTerminalThemeInternal || (appTheme === 'dark' || appTheme === 'system' ? 'dark' : 'light')}
          onTerminalThemeChange={(value) => { setSelectedTerminalThemeInternal(value); if(setAppSelectedTerminalTheme) setAppSelectedTerminalTheme(value);}}
          terminalThemesList={terminalThemesListForSelect}
        />
      </Tabs>
    </div>
  );
}