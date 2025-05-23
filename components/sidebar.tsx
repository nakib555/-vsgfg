"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback }
from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Send, Bot, User, Sparkles, Copy, Check, Trash, Settings, Code, FileCode, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import hljs from 'highlight.js';
// Note: highlight.js CSS (default.css and custom overrides) is imported in app/globals.css

type MessageType = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isTyping?: boolean // New flag for AI messages
}

interface GeminiModel {
  id: string
  name: string
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

const TYPING_SPEED = 30 // Milliseconds per character

export default function Sidebar() {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI coding assistant. Please set your Gemini API key in settings to begin.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [apiKeyInputValue, setApiKeyInputValue] = useState("")
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null)
  const [isVerifyingApiKey, setIsVerifyingApiKey] = useState(false)
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isAISending, setIsAISending] = useState(false) // Tracks if AI is processing/sending
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Effect for handling the typing animation
  useEffect(() => {
    const typingMessage = messages.find(msg => msg.isTyping && msg.role === 'assistant');
    if (typingMessage) {
      const fullText = typingMessage.content; // This will be the full text initially
      let currentText = "";
      let charIndex = 0;

      // Clear previous content for this message ID if it was re-triggered
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === typingMessage.id ? { ...msg, content: "" } : msg
        )
      );
      
      const intervalId = setInterval(() => {
        if (charIndex < fullText.length) {
          currentText += fullText[charIndex];
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === typingMessage.id ? { ...msg, content: currentText } : msg
            )
          );
          charIndex++;
        } else {
          clearInterval(intervalId);
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === typingMessage.id ? { ...msg, isTyping: false } : msg
            )
          );
        }
      }, TYPING_SPEED);

      return () => clearInterval(intervalId);
    }
  }, [messages.find(msg => msg.isTyping === true)?.id]); // Re-run if the ID of the typing message changes


  const handleVerifyApiKey = async () => {
    // ... (same as before)
    if (!apiKeyInputValue.trim()) {
      toast.error("API Key cannot be empty.")
      return
    }
    setIsVerifyingApiKey(true)
    setIsLoadingModels(true)
    setAvailableModels([]) 
    setSelectedModel("")

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKeyInputValue.trim()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error?.message || `Failed to fetch models. Status: ${response.status}`)
      }
      
      const data = await response.json()
      const fetchedModels: GeminiModel[] = data.models
        .filter((model: any) => 
          model.supportedGenerationMethods?.includes("generateContent") &&
          (model.name.includes("gemini-1.5-flash") || model.name.includes("gemini-1.5-pro") || model.name.includes("gemini-pro"))
        )
        .map((model: any) => ({
          id: model.name, 
          name: model.displayName,
        }));

      if (fetchedModels.length === 0) {
        toast.warning("No suitable models found with this API key, or the models are not accessible. Please check your key and permissions.", { duration: 5000 })
        setActiveApiKey(null)
      } else {
        setAvailableModels(fetchedModels)
        setActiveApiKey(apiKeyInputValue.trim())
        const flashModel = fetchedModels.find(m => m.id.includes('flash'));
        setSelectedModel(flashModel ? flashModel.id : fetchedModels[0].id);
        toast.success("API Key set and models loaded successfully!")
      }

    } catch (error: any) {
      console.error("Error verifying API key or fetching models:", error)
      toast.error(`Error: ${error.message || "Could not verify API key or fetch models."}`, { duration: 7000 })
      setActiveApiKey(null)
      setAvailableModels([])
    } finally {
      setIsVerifyingApiKey(false)
      setIsLoadingModels(false)
    }
  }

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !activeApiKey || !selectedModel) {
      if(!activeApiKey) toast.error("Please set your Gemini API key in Settings first.");
      if(!selectedModel && activeApiKey) toast.error("Please select a model in Settings first.");
      return;
    }

    const newUserMessage: MessageType = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMessage])
    const currentInput = inputValue;
    setInputValue("")
    setIsAISending(true) // AI starts processing

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = "60px"
    }
    
    const conversationHistory: GeminiContent[] = messages
      .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && !msg.isTyping)) // Exclude currently typing AI message from history
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));
    
    const apiPayloadContents: GeminiContent[] = [
        ...conversationHistory,
        { role: 'user', parts: [{ text: currentInput }] }
    ];

    // Add a placeholder AI message that will be filled by the typing effect
    const aiMessageId = (Date.now() + 1).toString();
    const placeholderAiMessage: MessageType = {
      id: aiMessageId,
      role: "assistant",
      content: "", // Will be filled by API
      timestamp: new Date(),
      isTyping: true, // This message will be typed out
    };
    setMessages((prev) => [...prev, placeholderAiMessage]);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${activeApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: apiPayloadContents }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error?.message || `API request failed. Status: ${response.status}`)
      }

      const data = await response.json()
      
      let aiResponseContent = "Sorry, I couldn't get a response."
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
        aiResponseContent = data.candidates[0].content.parts[0].text
      } else if (data.promptFeedback && data.promptFeedback.blockReason) {
        aiResponseContent = `Request blocked: ${data.promptFeedback.blockReason}. ${data.promptFeedback.blockReasonMessage || ''}`;
        toast.warning(aiResponseContent, { duration: 7000 });
      }

      // Update the placeholder message with the full content to start typing
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? { ...msg, content: aiResponseContent, isTyping: true } : msg
      ));

    } catch (error: any) {
      console.error("Error sending message to Gemini:", error)
      const errorMessage = `Sorry, I encountered an error: ${error.message || "Could not connect to the AI service."}`;
      toast.error(errorMessage, { duration: 7000 })
      // Update placeholder with error and stop typing
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? { ...msg, content: errorMessage, isTyping: false } : msg
      ));
    } finally {
      setIsAISending(false); // AI finished processing/sending
    }
  }, [inputValue, activeApiKey, selectedModel, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Chat cleared. How can I help you today?",
        timestamp: new Date(),
      },
    ])
    toast.info("Chat cleared.")
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`
  }

  const formatMessageContent = useCallback((content: string, messageId: string, isCurrentlyTyping?: boolean) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];
  
    // If the message is currently being typed and ends with incomplete backticks,
    // we might want to treat it as plain text until the block is fully formed.
    // However, for a more "live" effect, we'll let it try to parse.
    // The regex will only match complete blocks.
  
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || ""; // Default to empty string if no language
      const code = match[2];
      const offset = match.index;
  
      // Add text part before the code block
      if (offset > lastIndex) {
        elements.push(
          <p key={`${messageId}-text-${lastIndex}`} className="whitespace-pre-wrap">
            {content.substring(lastIndex, offset)}
          </p>
        );
      }
  
      // Add code block
      const codeBlockId = `${messageId}-code-${offset}`;
      const highlightedCode = hljs.highlight(code.trim(), { // trim code before highlighting
        language: language || 'plaintext',
        ignoreIllegals: true
      }).value;

      elements.push(
        <div key={codeBlockId} className="ai-chat-code-block relative my-2 rounded-md bg-muted/70 font-mono text-sm group/codeblock">
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border flex justify-between items-center">
            <span>{language || "code"}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-50 group-hover/codeblock:opacity-100 transition-opacity"
              onClick={() => copyToClipboard(code, codeBlockId)}
              title="Copy code"
            >
              {copiedId === codeBlockId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <pre> {/* Removed p-3 overflow-x-auto; hljs default.css styles pre code.hljs */}
            <code
              className={cn("hljs", language && `language-${language}`)} // Add hljs and language-xxx class
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
      );
      lastIndex = offset + match[0].length;
    }
  
    // Add any remaining text after the last code block
    if (lastIndex < content.length) {
      elements.push(
        <p key={`${messageId}-text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.substring(lastIndex)}
        </p>
      );
    }
    
    // Add a blinking cursor if this message is the one being typed by AI
    if (isCurrentlyTyping) {
        elements.push(<span key={`${messageId}-cursor`} className="inline-block h-4 w-1 bg-primary animate-pulse ml-0.5"></span>);
    }
  
    return <>{elements.length > 0 ? elements : <span className="whitespace-pre-wrap">{content}</span>}</>;
  }, [copiedId]);


  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-3 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          AI Assistant
        </h2>
        <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat">
          <Trash className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-2 shrink-0">
          <TabsTrigger value="chat" className="flex items-center">
            <Sparkles className="mr-2 h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex flex-col flex-1 overflow-y-hidden">
          <ScrollArea className="flex-1 p-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("p-3 rounded-lg mb-3", message.role === "user" ? "bg-muted/40 ml-4" : "bg-muted/20 mr-4")}
              >
                <div className="flex items-center mb-1">
                  {message.role === "assistant" ? (
                    <Bot className="h-4 w-4 mr-1 text-primary" />
                  ) : (
                    <User className="h-4 w-4 mr-1 text-primary" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {message.role === "assistant" ? "AI Assistant" : "You"} •{" "}
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {/* General copy button for non-code, non-typing assistant messages */}
                  {message.role === "assistant" && !message.isTyping && !message.content.includes("```") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 ml-auto opacity-70 hover:opacity-100"
                      onClick={() => copyToClipboard(message.content, message.id)}
                      title="Copy message"
                    >
                      {copiedId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
                <div className="pl-5 text-sm">
                  {formatMessageContent(message.content, message.id, message.isTyping && message.role === 'assistant')}
                </div>
              </div>
            ))}
            {/* Removed the old "isTyping" indicator block as it's now part of the message itself */}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-3 border-t border-border mt-auto shrink-0">
            <div className="flex flex-col space-y-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={activeApiKey && selectedModel ? "Ask me anything about coding..." : "Set API Key and select model in Settings to chat."}
                className="min-h-[60px] max-h-[150px] resize-none"
                rows={1}
                disabled={!activeApiKey || !selectedModel || isAISending || messages.some(m => m.isTyping)}
              />
              <div className="flex justify-between items-center">
                <div className="flex space-x-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Insert code snippet (coming soon)" disabled>
                    <Code className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Upload file (coming soon)" disabled>
                    <FileCode className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isAISending || !activeApiKey || !selectedModel || messages.some(m => m.isTyping)}
                  className="flex items-center"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-0 px-3 pt-1.5 pb-3 space-y-3 flex-1 overflow-y-auto">
          {/* ... Settings content remains the same ... */}
          <div className="space-y-1">
            <label htmlFor="apiKeyInput" className="text-sm font-medium">Gemini API Key</label>
            <div className="flex items-center space-x-2">
              <Input
                id="apiKeyInput"
                type="password"
                value={apiKeyInputValue}
                onChange={(e) => setApiKeyInputValue(e.target.value)}
                placeholder="Enter your Gemini API Key"
                disabled={isVerifyingApiKey}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyApiKey(); }}
              />
              <Button onClick={handleVerifyApiKey} disabled={isVerifyingApiKey || !apiKeyInputValue.trim()} className="shrink-0">
                {isVerifyingApiKey ? "Verifying..." : "Set & Load"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Gemini API key is required. Get yours from Google AI Studio.
              {activeApiKey && <span className="ml-1 font-medium text-green-500">Key is active.</span>}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="modelSelect" className="text-sm font-medium">Model</label>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={!activeApiKey || isLoadingModels || availableModels.length === 0}
            >
              <SelectTrigger id="modelSelect">
                <SelectValue 
                  placeholder={
                    !activeApiKey 
                      ? "Set API key first" 
                      : isLoadingModels 
                        ? "Loading models..." 
                        : availableModels.length === 0 
                          ? "No models available"
                          : "Select a model"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} ({model.id.split('/')[1]})
                  </SelectItem>
                ))}
                {availableModels.length === 0 && !isLoadingModels && activeApiKey && (
                  <div className="p-2 text-sm text-muted-foreground flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" /> No compatible models found or API key invalid.
                  </div>
                )}
                 {availableModels.length === 0 && !isLoadingModels && !activeApiKey && (
                  <div className="p-2 text-sm text-muted-foreground flex items-center">
                     <AlertCircle className="w-4 h-4 mr-2" /> Set API key to load models.
                  </div>
                )}
              </SelectContent>
            </Select>
             <p className="text-xs text-muted-foreground">
              Select a Gemini model. Models are loaded after setting a valid API key.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="themeSelect" className="text-sm font-medium">Theme</label>
            <Select defaultValue="dark" disabled>
              <SelectTrigger id="themeSelect">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark (Default)</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Chat theme is currently synced with app theme.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}