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

console.log("[Sidebar.tsx] File processed (client-side module evaluation) at", new Date().toISOString());

interface TypingState {
  charIndex: number;
}

export interface GeminiModel { // Exporting for use in SettingsTab
  id: string;
  name: string;
}

export interface GeminiContent {
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
  console.log("[Sidebar] Rendering Sidebar component function executed at", new Date().toISOString());
  console.log("[Sidebar] Initial Props:", { onRefreshFileTree: !!onRefreshFileTree, onAiOpenFileInEditor: !!onAiOpenFileInEditor, onAiExecuteTerminalCommand: !!onAiExecuteTerminalCommand, appCurrentEditorTheme, appCurrentTerminalTheme, isTerminalInputDisabled });

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
  const [enableCopy] = useState(true); // Assuming this is a static config for now
  const [typingStates, setTypingStates] = useState<Record<string, TypingState>>({});
  const TYPING_SPEED = 1; // milliseconds per character

  const stopGeneratingRef = useRef(false);

  const { theme: appTheme, setTheme: setAppTheme, resolvedTheme } = useTheme();
  console.log("[Sidebar] useTheme hook values:", { appTheme, resolvedTheme });

  const getInitialShikiTheme = useCallback((currentAppTheme?: string, currentResolvedTheme?: string) => {
    console.log("[Sidebar] getInitialShikiTheme called with:", { currentAppTheme, currentResolvedTheme });
    let themeModeToUse = 'dark';
    if (currentAppTheme && currentAppTheme !== 'system') {
        if (currentAppTheme === 'light' || currentAppTheme === 'sandstone') themeModeToUse = 'light';
        else if (currentAppTheme === 'dark' || currentAppTheme === 'midnight-blue') themeModeToUse = 'dark';
        else if (currentResolvedTheme) themeModeToUse = currentResolvedTheme;
    } else if (currentResolvedTheme) {
        themeModeToUse = currentResolvedTheme;
    }
    const initialTheme = themeModeToUse === 'dark' ? 'github-dark' : 'github-light';
    console.log("[Sidebar] getInitialShikiTheme determined initial theme:", initialTheme);
    return initialTheme;
  }, []);

  const [selectedShikiTheme, setSelectedShikiTheme] = useState<BundledTheme>(() => getInitialShikiTheme(appTheme, resolvedTheme));
  console.log("[Sidebar] Initial selectedShikiTheme state:", selectedShikiTheme);

  const [selectedEditorThemeInternal, setSelectedEditorThemeInternal] = useState<EditorTheme | undefined>(appCurrentEditorTheme);
  const [selectedTerminalThemeInternal, setSelectedTerminalThemeInternal] = useState<string | undefined>(appCurrentTerminalTheme);
  console.log("[Sidebar] Initial internal editor/terminal themes:", { selectedEditorThemeInternal, selectedTerminalThemeInternal });


  useEffect(() => {
    console.log("[Sidebar] useEffect for theme synchronization triggered at", new Date().toISOString(), { appTheme, resolvedTheme, selectedShikiTheme, selectedEditorThemeInternal, selectedTerminalThemeInternal });
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
    console.log("[Sidebar] Theme sync: Determined currentMode:", currentMode);

    const currentShikiThemeInfo = shikiThemesListForSelect.find(t => t.value === selectedShikiTheme);
    if (currentShikiThemeInfo?.type !== currentMode) {
      const newShikiTheme = currentMode === 'dark' ? 'github-dark' : 'github-light';
      console.log(`[Sidebar] Theme sync: Shiki theme mismatch (current: ${selectedShikiTheme}, mode: ${currentMode}). Setting to: ${newShikiTheme}`);
      setSelectedShikiTheme(newShikiTheme);
    }

    const newEditorTheme: EditorTheme = currentMode === 'dark' ? 'vs-dark' : 'vs';
    if (selectedEditorThemeInternal !== newEditorTheme) {
      console.log(`[Sidebar] Theme sync: Editor theme mismatch (current: ${selectedEditorThemeInternal}, mode: ${currentMode}). Setting to: ${newEditorTheme}`);
      setSelectedEditorThemeInternal(newEditorTheme);
      if (setAppSelectedEditorTheme) setAppSelectedEditorTheme(newEditorTheme);
    }

    const newTerminalTheme = currentMode === 'dark' ? 'dark' : 'light';
    if (selectedTerminalThemeInternal !== newTerminalTheme) {
      console.log(`[Sidebar] Theme sync: Terminal theme mismatch (current: ${selectedTerminalThemeInternal}, mode: ${currentMode}). Setting to: ${newTerminalTheme}`);
      setSelectedTerminalThemeInternal(newTerminalTheme);
      if (setAppSelectedTerminalTheme) setAppSelectedTerminalTheme(newTerminalTheme);
    }
  }, [appTheme, resolvedTheme, selectedShikiTheme, selectedEditorThemeInternal, selectedTerminalThemeInternal, setAppSelectedEditorTheme, setAppSelectedTerminalTheme]);


  useEffect(() => {
    console.log("[Sidebar] useEffect for Shiki initialization triggered at", new Date().toISOString());
    let isMounted = true;
    async function initShiki() {
      console.log("[Sidebar] initShiki: Attempting to get highlighter...");
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
        if (isMounted) {
          console.log("[Sidebar] initShiki: Highlighter loaded successfully.");
          setHighlighter(shikiHighlighter);
        } else {
          console.log("[Sidebar] initShiki: Highlighter loaded, but component unmounted.");
        }
      } catch (error) {
        console.error("[Sidebar] initShiki: Failed to initialize Shiki highlighter:", error);
        if (isMounted) toast.error("Code syntax highlighter failed to load.");
      }
    }
    initShiki();
    return () => {
      console.log("[Sidebar] useEffect for Shiki initialization cleanup (isMounted=false) at", new Date().toISOString());
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // console.log("[Sidebar] useEffect for message typing animation triggered at", new Date().toISOString(), { messagesLength: messages.length, stopGeneratingRef: stopGeneratingRef.current });
    let activeIntervals: NodeJS.Timeout[] = [];
    messages.forEach(message => {
      if (message.isTyping && message.role === 'assistant') {
        // console.log(`[Sidebar] Typing animation: Processing message ID ${message.id}`);
        const textToType = message._currentTextPart === 'before' ? message._mainContentBefore : message._mainContentAfter;

        if (!textToType) {
          // console.log(`[Sidebar] Typing animation: No text to type for message ID ${message.id}. Stopping typing.`);
          setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id ? { ...m, isTyping: false } : m));
          setTypingStates(prev => { const newStates = {...prev}; if (newStates[message.id]) delete newStates[message.id]; return newStates; });
          return;
        }

        const intervalId = setInterval(() => {
          if (stopGeneratingRef.current && message.id === messages.find(m => m.isTyping && m.role === 'assistant')?.id) {
            // console.log(`[Sidebar] Typing animation: Stop generating requested for message ID ${message.id}. Clearing interval.`);
            clearInterval(intervalId);
            setMessages(prevMsgs => prevMsgs.map(m => {
                if (m.id === message.id) {
                    const currentProgress = typingStates[m.id]?.charIndex || 0;
                    const fullText = m._currentTextPart === 'before' ? m._mainContentBefore : m._mainContentAfter;
                    return { ...m, isTyping: false, content: (fullText || "").substring(0, currentProgress) + " [Stopped]" };
                }
                return m;
            }));
            setTypingStates(prev => { const newStates = {...prev}; if (newStates[message.id]) delete newStates[message.id]; return newStates; });
            return;
          }

          setTypingStates(currentStates => {
            const stateForMessage = currentStates[message.id] || { charIndex: 0 };
            let newCharIndex = stateForMessage.charIndex;

            const currentMessageBeingTyped = messages.find(m => m.id === message.id); // Get latest message state
            const currentTextToType = currentMessageBeingTyped ? (currentMessageBeingTyped._currentTextPart === 'before' ? currentMessageBeingTyped._mainContentBefore : currentMessageBeingTyped._mainContentAfter) : textToType;

            if (newCharIndex < (currentTextToType || "").length) {
              newCharIndex++;
              const newDisplayedText = (currentTextToType || "").substring(0, newCharIndex);
              const isFinished = newCharIndex >= (currentTextToType || "").length;
              // console.log(`[Sidebar] Typing animation: Message ID ${message.id}, CharIndex: ${newCharIndex}, Finished: ${isFinished}`);

              setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id ? { ...m, content: newDisplayedText, isTyping: !isFinished } : m ));
              if (isFinished) {
                // console.log(`[Sidebar] Typing animation: Finished typing message ID ${message.id}. Clearing interval.`);
                clearInterval(intervalId);
                const nextTypingStates = { ...currentStates }; delete nextTypingStates[message.id]; return nextTypingStates;
              }
              return { ...currentStates, [message.id]: { charIndex: newCharIndex } };
            } else {
              // console.log(`[Sidebar] Typing animation: CharIndex exceeded text length for message ID ${message.id}. Clearing interval.`);
              clearInterval(intervalId);
              setMessages(prevMsgs => prevMsgs.map(m => m.id === message.id && m.isTyping ? { ...m, isTyping: false } : m));
              const nextTypingStates = { ...currentStates }; delete nextTypingStates[message.id]; return nextTypingStates;
            }
          });
        }, TYPING_SPEED);
        activeIntervals.push(intervalId);
      } else if (!message.isTyping && typingStates[message.id]) {
        // console.log(`[Sidebar] Typing animation: Message ID ${message.id} no longer typing, removing from typingStates.`);
         setTypingStates(prev => { const newStates = {...prev}; if (newStates[message.id]) delete newStates[message.id]; return newStates; });
      }
    });

    if (stopGeneratingRef.current && !messages.some(m => m.isTyping && m.role === 'assistant')) {
        // console.log("[Sidebar] Typing animation: All assistant typing stopped, resetting stopGeneratingRef.");
        stopGeneratingRef.current = false;
    }

    return () => {
      // console.log("[Sidebar] useEffect for message typing animation cleanup at", new Date().toISOString());
      activeIntervals.forEach(clearInterval);
    };
  }, [messages, TYPING_SPEED, setMessages, setTypingStates, stopGeneratingRef]); // Removed typingStates from deps to avoid re-triggering on its own change


  const handleVerifyApiKey = useCallback(async () => {
    console.log("[Sidebar] handleVerifyApiKey called at", new Date().toISOString(), { apiKeyInputValue });
    if (!apiKeyInputValue.trim()) { toast.error("API Key cannot be empty."); return; }
    setIsVerifyingApiKey(true); setIsLoadingModels(true); setAvailableModels([]); setSelectedModel("");
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKeyInputValue.trim()}`);
      console.log("[Sidebar] handleVerifyApiKey: API response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Sidebar] handleVerifyApiKey: API error data:", errorData);
        throw new Error(errorData?.error?.message || `Failed to fetch models. Status: ${response.status}`);
      }
      const data = await response.json();
      console.log("[Sidebar] handleVerifyApiKey: API success data:", data);
      const fetchedModels: GeminiModel[] = data.models
        .filter((model: any) => model.supportedGenerationMethods?.includes("generateContent"))
        .map((model: any) => ({ id: model.name, name: model.displayName || model.name }));
      console.log("[Sidebar] handleVerifyApiKey: Fetched models:", fetchedModels);

      if (fetchedModels.length === 0) {
        toast.warning("No suitable models (that support generateContent) found. Check key/permissions.", { duration: 5000 });
        setActiveApiKey(null);
      } else {
        setAvailableModels(fetchedModels); setActiveApiKey(apiKeyInputValue.trim());
        const flashModel = fetchedModels.find(m => m.id.includes('flash'));
        const proModel = fetchedModels.find(m => m.id.includes('pro') && !m.id.includes('vision'));
        let newSelectedModel = "";
        if (flashModel) newSelectedModel = flashModel.id;
        else if (proModel) newSelectedModel = proModel.id;
        else newSelectedModel = fetchedModels[0].id;
        setSelectedModel(newSelectedModel);
        console.log("[Sidebar] handleVerifyApiKey: Selected model:", newSelectedModel);
        toast.success("API Key set and models loaded!");
      }
    } catch (error: any) {
      console.error("[Sidebar] handleVerifyApiKey: Error verifying API key:", error);
      toast.error(`Error: ${error.message || "Could not verify API key."}`, { duration: 7000 });
      setActiveApiKey(null); setAvailableModels([]);
    } finally {
      setIsVerifyingApiKey(false); setIsLoadingModels(false);
      console.log("[Sidebar] handleVerifyApiKey finished at", new Date().toISOString());
    }
  }, [apiKeyInputValue]);

  const handleSendMessage = useCallback(async (
    isReprompt: boolean = false,
    repromptHistoryWithContext?: GeminiContent[]
  ) => {
    console.log("[Sidebar] handleSendMessage called at", new Date().toISOString(), { inputValue, isReprompt, activeApiKeySet: !!activeApiKey, selectedModel });
    if (!inputValue.trim() && !isReprompt) { toast.error("Message cannot be empty."); return; }
    if (!activeApiKey || !selectedModel) {
      if (!activeApiKey) toast.error("Set API Key in Settings.");
      if (!selectedModel && activeApiKey) toast.error("Select a model in Settings.");
      return;
    }
    stopGeneratingRef.current = false;
    const currentInput = inputValue;

    if (!isReprompt) {
      const newUserMessage: MessageType = { id: Date.now().toString(), role: "user", content: currentInput, timestamp: new Date(), isTyping: false };
      console.log("[Sidebar] handleSendMessage: Adding new user message:", newUserMessage);
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
    console.log("[Sidebar] handleSendMessage: Contents for API:", contentsForApi);

    const apiRequestBody = {
      contents: contentsForApi,
      systemInstruction: { parts: [{ text: CODEFORGE_SYSTEM_PROMPT }] }
    };
    console.log("[Sidebar] handleSendMessage: API request body (system prompt omitted for brevity):", { contents: apiRequestBody.contents });

    const aiMessageId = (Date.now() + 1).toString();
    const placeholderAiMessage: MessageType = {
      id: aiMessageId, role: "assistant", content: "", actionBlock: null, timestamp: new Date(),
      isTyping: false, _mainContentBefore: "", _mainContentAfter: "", _actionsProcessed: false, _currentTextPart: 'before',
    };
    console.log("[Sidebar] handleSendMessage: Adding placeholder AI message:", placeholderAiMessage);
    setMessages((prev) => [...prev, placeholderAiMessage]);

    try {
      console.log("[Sidebar] handleSendMessage: Fetching AI response from:", `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${activeApiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(apiRequestBody),
      });
      console.log("[Sidebar] handleSendMessage: AI API response status:", response.status);

      let rawAiResponseText = "{\"mainContentBefore\": \"Sorry, I couldn't get a response.\", \"steps\": null, \"mainContentAfter\": null, \"errorMessage\": \"No content from API.\"}"
      if (response.ok) {
        const data = await response.json();
        console.log("[Sidebar] handleSendMessage: AI API success data:", data);
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          rawAiResponseText = data.candidates[0].content.parts[0].text;
        } else if (data.promptFeedback?.blockReason) {
          rawAiResponseText = JSON.stringify({
            mainContentBefore: `Request blocked: ${data.promptFeedback.blockReason}. ${data.promptFeedback.blockReasonMessage || ''}`,
            steps: null, mainContentAfter: null, errorMessage: `Blocked: ${data.promptFeedback.blockReason}`
          });
          toast.warning(`Request blocked: ${data.promptFeedback.blockReason}`, { duration: 7000 });
        }
      } else {
         const errorData = await response.json().catch(() => ({}));
         console.error("[Sidebar] handleSendMessage: AI API error data:", errorData);
         rawAiResponseText = JSON.stringify({
            mainContentBefore: `API request failed. Status: ${response.status}. ${errorData?.error?.message || ''}`,
            steps: null, mainContentAfter: null, errorMessage: `API Error: ${response.status}`
         });
      }
      console.log("[Sidebar] handleSendMessage: Raw AI response text (trimmed):", rawAiResponseText.substring(0, 200) + "...");

      let parsedResponse: AiJsonResponse;
      let finalMainContentBefore = ""; let finalActionBlock: AiActionBlock | null = null; let finalMainContentAfter = "";
      let jsonStringToParse = rawAiResponseText.trim();

      try {
        if (jsonStringToParse.startsWith("```json")) jsonStringToParse = jsonStringToParse.substring(7);
        else if (jsonStringToParse.startsWith("```")) jsonStringToParse = jsonStringToParse.substring(3);
        if (jsonStringToParse.endsWith("```")) jsonStringToParse = jsonStringToParse.substring(0, jsonStringToParse.length - 3);
        jsonStringToParse = jsonStringToParse.trim();

        parsedResponse = JSON.parse(jsonStringToParse);
        console.log("[Sidebar] handleSendMessage: Parsed AI JSON response:", parsedResponse);
        finalMainContentBefore = parsedResponse.mainContentBefore || "";
        if (parsedResponse.steps && parsedResponse.steps.length > 0) {
          finalActionBlock = { project: parsedResponse.project || undefined, steps: parsedResponse.steps.map(step => ({ ...step, id: generateId(), currentStatus: 'idle' })) };
        }
        finalMainContentAfter = parsedResponse.mainContentAfter || "";
        if (parsedResponse.errorMessage) {
          finalMainContentBefore = `${finalMainContentBefore}${finalMainContentBefore ? '\n\n' : ''}**AI Error:** ${parsedResponse.errorMessage}`;
          toast.error(`AI reported an error: ${parsedResponse.errorMessage}`);
        }
      } catch (jsonParseError) {
        console.error("[Sidebar] handleSendMessage: Failed to parse AI JSON response:", jsonParseError, "Raw response was:", rawAiResponseText, "Attempted to parse:", jsonStringToParse);
        toast.error("AI response was not valid JSON. Displaying raw output.");
      }

      if (stopGeneratingRef.current) {
        console.log("[Sidebar] handleSendMessage: Stop generating was requested during API call. Updating message and returning.");
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: (typingStates[aiMessageId] ? (msg._currentTextPart === 'before' ? msg._mainContentBefore : msg._mainContentAfter) : msg.content || "").substring(0, typingStates[aiMessageId]?.charIndex || 0) + " [Stopped by user]", actionBlock: null, isTyping: false, _actionsProcessed: true } : msg));
        setIsAISending(false); stopGeneratingRef.current = false; return;
      }

      console.log("[Sidebar] handleSendMessage: Updating AI message with processed content:", { aiMessageId, finalMainContentBeforeLength: finalMainContentBefore.length, finalActionBlockExists: !!finalActionBlock, finalMainContentAfterLength: finalMainContentAfter.length });
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? {
          ...msg, content: "", actionBlock: finalActionBlock, isTyping: !!(finalMainContentBefore),
          _mainContentBefore: finalMainContentBefore, _mainContentAfter: finalMainContentAfter,
          _currentTextPart: 'before', _actionsProcessed: !finalActionBlock,
        } : msg
      ));

      if (finalMainContentBefore && TYPING_SPEED > 0) {
        console.log("[Sidebar] handleSendMessage: Starting typing animation for mainContentBefore.");
        setTypingStates(prev => ({...prev, [aiMessageId]: { charIndex: 0 }}));
      } else if (!finalMainContentBefore && finalActionBlock) {
        console.log("[Sidebar] handleSendMessage: No mainContentBefore, actionBlock exists. Action processing will be handled by ChatInterface's useEffect.");
      } else if (!finalMainContentBefore && !finalActionBlock && finalMainContentAfter) {
         console.log("[Sidebar] handleSendMessage: No mainContentBefore or actionBlock, but mainContentAfter exists. Starting typing for mainContentAfter.");
         setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: "", isTyping: true, _currentTextPart: 'after', _mainContentBefore: finalMainContentAfter, _mainContentAfter: "", _actionsProcessed: true } : msg ));
        if (TYPING_SPEED > 0) setTypingStates(prev => ({...prev, [aiMessageId]: { charIndex: 0 }}));
      } else if (!finalMainContentBefore && !finalActionBlock && !finalMainContentAfter) {
        console.log("[Sidebar] handleSendMessage: Empty response from AI (no content before, after, or actions).");
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? {...msg, content: "[Empty Response]", isTyping: false, _actionsProcessed: true} : msg));
      }

    } catch (error: any) {
      console.error("[Sidebar] handleSendMessage: Error sending message:", error);
      const errMsg = `Error: ${error.message || "Could not connect."}`;
      toast.error(errMsg, { duration: 7000 });
      setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: errMsg, isTyping: false, _actionsProcessed: true } : msg));
      setTypingStates(prev => { const n = {...prev}; delete n[aiMessageId]; return n; });
    } finally {
      setIsAISending(false);
      console.log("[Sidebar] handleSendMessage finished at", new Date().toISOString());
    }
  }, [inputValue, activeApiKey, selectedModel, messages, TYPING_SPEED, setTypingStates, setMessages, setInputValue, setIsAISending]); // Removed typingStates from deps

  const handleStopGenerating = useCallback(() => {
    console.log("[Sidebar] handleStopGenerating called at", new Date().toISOString());
    stopGeneratingRef.current = true;
    setIsAISending(false);
    setMessages(prevMessages =>
      prevMessages.map(msg => {
        if (msg.role === 'assistant' && msg.isTyping) {
          return { ...msg, isTyping: false }; // Content will be updated by typing useEffect
        }
        return msg;
      })
    );
    toast.info("AI response generation stopped.");
  }, [setMessages, setIsAISending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // console.log("[Sidebar] handleKeyDown:", e.key, { shift: e.shiftKey });
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };
  const copyToClipboard = (text: string, id: string) => {
    console.log(`[Sidebar] copyToClipboard called for ID ${id}, text length: ${text.length}`);
    navigator.clipboard.writeText(text); setCopiedId(id); toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };
  const clearChat = () => {
    console.log("[Sidebar] clearChat called at", new Date().toISOString());
    setMessages([{ id: Date.now().toString(), role: "assistant", content: "Chat cleared. How can I help?", timestamp: new Date(), isTyping: false }]);
    toast.info("Chat cleared.");
  };

  console.log("[Sidebar] PRE-RENDER LOG at", new Date().toISOString(), {
    messagesCount: messages.length, inputValue, activeApiKeySet: !!activeApiKey, selectedModel, isAISending,
    selectedShikiTheme, selectedEditorThemeInternal, selectedTerminalThemeInternal, isTerminalInputDisabled
  });

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground">
      {console.log("[Sidebar] Rendering main div structure at", new Date().toISOString())}
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
          <TabsTrigger value="chat" id="sidebar-tab-trigger-chat" aria-controls="sidebar-tab-content-chat" className="flex items-center">
            <Sparkles className="mr-2 h-4 w-4" /> Chat
          </TabsTrigger>
          <TabsTrigger value="settings" id="sidebar-tab-trigger-settings" aria-controls="sidebar-tab-content-settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        {console.log("[Sidebar] Rendering ChatTab at", new Date().toISOString())}
        <ChatTab
          messages={messages} setMessages={setMessages} inputValue={inputValue} onInputChange={setInputValue}
          onSendMessage={handleSendMessage} onKeyDown={handleKeyDown} isAISending={isAISending}
          activeApiKey={activeApiKey} selectedModel={selectedModel} copiedId={copiedId} onCopyToClipboard={copyToClipboard}
          highlighter={highlighter} selectedShikiTheme={selectedShikiTheme} enableCopy={enableCopy}
          typingSpeed={TYPING_SPEED} onStopGenerating={handleStopGenerating}
          onAiOpenFileInEditor={onAiOpenFileInEditor} onAiExecuteTerminalCommand={onAiExecuteTerminalCommand}
          onRefreshFileTree={onRefreshFileTree}
          tabContentId="sidebar-tab-content-chat" ariaLabelledBy="sidebar-tab-trigger-chat"
        />

        {console.log("[Sidebar] Rendering SettingsTab at", new Date().toISOString())}
        <SettingsTab
          apiKeyInputValue={apiKeyInputValue} onApiKeyInputChange={setApiKeyInputValue} onVerifyApiKey={handleVerifyApiKey}
          isVerifyingApiKey={isVerifyingApiKey} activeApiKey={activeApiKey} availableModels={availableModels}
          selectedModel={selectedModel} onModelChange={setSelectedModel} isLoadingModels={isLoadingModels}
          appTheme={appTheme} onAppThemeChange={(value) => { console.log("[Sidebar] App theme changed to:", value); if (setAppTheme) setAppTheme(value); }}
          selectedShikiTheme={selectedShikiTheme} onShikiThemeChange={(value) => { console.log("[Sidebar] Shiki theme changed to:", value); setSelectedShikiTheme(value as BundledTheme);}}
          shikiThemesList={shikiThemesListForSelect.map(t => ({name: t.name, value: t.value}))}
          selectedEditorTheme={selectedEditorThemeInternal || (resolvedTheme === 'dark' ? 'vs-dark' : 'vs')}
          onEditorThemeChange={(value) => { console.log("[Sidebar] Editor theme changed to:", value); setSelectedEditorThemeInternal(value as EditorTheme); if(setAppSelectedEditorTheme) setAppSelectedEditorTheme(value as EditorTheme);}}
          editorThemesList={editorThemesList}
          selectedTerminalTheme={selectedTerminalThemeInternal || (resolvedTheme === 'dark' ? 'dark' : 'light')}
          onTerminalThemeChange={(value) => { console.log("[Sidebar] Terminal theme changed to:", value); setSelectedTerminalThemeInternal(value); if(setAppSelectedTerminalTheme) setAppSelectedTerminalTheme(value);}}
          terminalThemesList={terminalThemesListForSelect}
          isTerminalInputDisabled={isTerminalInputDisabled} setIsTerminalInputDisabled={setIsTerminalInputDisabled}
          tabContentId="sidebar-tab-content-settings" ariaLabelledBy="sidebar-tab-trigger-settings"
        />
      </Tabs>
      {console.log("[Sidebar] Finished rendering Sidebar component's JSX at", new Date().toISOString())}
    </div>
  );
}
