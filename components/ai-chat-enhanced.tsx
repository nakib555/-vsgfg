"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Copy, 
  Check, 
  Trash, 
  Settings, 
  Code, 
  FileCode, 
  AlertCircle,
  FileText,
  FolderPlus,
  FilePlus,
  Play,
  Square,
  Loader2,
  Wand2,
  Folder,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import hljs from 'highlight.js'
import type { CodeFile } from "@/types/file"

type MessageType = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isTyping?: boolean
  fileOperations?: FileOperation[]
  isStreaming?: boolean
}

type FileOperation = {
  type: 'create' | 'update' | 'delete' | 'create-folder'
  path: string
  content?: string
  language?: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
  progress?: number
  description?: string
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

interface EnhancedAIChatProps {
  files: CodeFile[]
  onFileCreate: (file: CodeFile) => void
  onFileUpdate: (file: CodeFile) => void
  onFileDelete: (fileId: string) => void
}

const TYPING_SPEED = 8 // Very fast typing like bolt.new
const PROJECT_FOLDER = "ai-project" // Dedicated folder for AI-generated files

export default function EnhancedAIChat({ files, onFileCreate, onFileUpdate, onFileDelete }: EnhancedAIChatProps) {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "1",
      role: "assistant",
      content: "🚀 Welcome to your AI coding assistant! I can help you build complete projects with live file creation and updates.\n\nJust describe what you want to build and I'll create the files with live typing animations, organize them in folders, and set up your project structure.\n\nTry saying: \"Create a React todo app\" or \"Build a landing page with HTML and CSS\"",
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
  const [isAISending, setIsAISending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentlyTypingFile, setCurrentlyTypingFile] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Enhanced typing effect with live file content typing
  useEffect(() => {
    const typingMessage = messages.find(msg => msg.isTyping && msg.role === 'assistant');
    if (typingMessage) {
      const fullText = typingMessage.content;
      let currentText = "";
      let charIndex = 0;

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
          
          // Execute file operations after typing is complete
          if (typingMessage.fileOperations) {
            executeFileOperations(typingMessage.fileOperations, typingMessage.id);
          }
        }
      }, TYPING_SPEED);

      return () => clearInterval(intervalId);
    }
  }, [messages.find(msg => msg.isTyping === true)?.id]);

  const executeFileOperations = async (operations: FileOperation[], messageId: string) => {
    for (const operation of operations) {
      // Update operation status to in-progress
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? {
              ...msg, 
              fileOperations: msg.fileOperations?.map(op => 
                op.path === operation.path ? { ...op, status: 'in-progress', progress: 0 } : op
              )
            }
          : msg
      ));

      setCurrentlyTypingFile(operation.path);

      try {
        if (operation.type === 'create-folder') {
          // Create folder (visual only, folders are implicit in file paths)
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? {
                  ...msg, 
                  fileOperations: msg.fileOperations?.map(op => 
                    op.path === operation.path ? { ...op, status: 'completed', progress: 100 } : op
                  )
                }
              : msg
          ));
          
          toast.success(`📁 Created folder: ${operation.path}`);
          
        } else if (operation.type === 'create' && operation.content) {
          // Live typing animation for file content
          const content = operation.content;
          let typedContent = "";
          
          // Create file with empty content first
          const newFile: CodeFile = {
            id: Date.now().toString() + Math.random(),
            name: operation.path.split('/').pop() || 'untitled',
            path: operation.path,
            content: "",
            language: operation.language || getLanguageFromPath(operation.path)
          };
          onFileCreate(newFile);

          // Type content character by character
          for (let i = 0; i <= content.length; i++) {
            typedContent = content.substring(0, i);
            
            // Update file content
            onFileUpdate({
              ...newFile,
              content: typedContent
            });

            // Update progress
            const progress = Math.round((i / content.length) * 100);
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? {
                    ...msg, 
                    fileOperations: msg.fileOperations?.map(op => 
                      op.path === operation.path ? { ...op, progress } : op
                    )
                  }
                : msg
            ));

            await new Promise(resolve => setTimeout(resolve, 2)); // Very fast typing
          }

          // Mark as completed
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? {
                  ...msg, 
                  fileOperations: msg.fileOperations?.map(op => 
                    op.path === operation.path ? { ...op, status: 'completed', progress: 100 } : op
                  )
                }
              : msg
          ));

          toast.success(`✅ Created: ${operation.path}`);
          
        } else if (operation.type === 'update' && operation.content) {
          const existingFile = files.find(f => f.path === operation.path);
          if (existingFile) {
            // Live typing for updates too
            const content = operation.content;
            let typedContent = "";
            
            for (let i = 0; i <= content.length; i++) {
              typedContent = content.substring(0, i);
              
              onFileUpdate({
                ...existingFile,
                content: typedContent
              });

              const progress = Math.round((i / content.length) * 100);
              setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                  ? {
                      ...msg, 
                      fileOperations: msg.fileOperations?.map(op => 
                        op.path === operation.path ? { ...op, progress } : op
                      )
                    }
                  : msg
              ));

              await new Promise(resolve => setTimeout(resolve, 2));
            }

            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? {
                    ...msg, 
                    fileOperations: msg.fileOperations?.map(op => 
                      op.path === operation.path ? { ...op, status: 'completed', progress: 100 } : op
                    )
                  }
                : msg
            ));

            toast.success(`🔄 Updated: ${operation.path}`);
          }
        } else if (operation.type === 'delete') {
          const existingFile = files.find(f => f.path === operation.path);
          if (existingFile) {
            onFileDelete(existingFile.id);
            
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? {
                    ...msg, 
                    fileOperations: msg.fileOperations?.map(op => 
                      op.path === operation.path ? { ...op, status: 'completed', progress: 100 } : op
                    )
                  }
                : msg
            ));

            toast.success(`🗑️ Deleted: ${operation.path}`);
          }
        }

      } catch (error) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? {
                ...msg, 
                fileOperations: msg.fileOperations?.map(op => 
                  op.path === operation.path ? { ...op, status: 'error' } : op
                )
              }
            : msg
        ));
        toast.error(`❌ Failed to ${operation.type}: ${operation.path}`);
      }
    }
    
    setCurrentlyTypingFile(null);
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'vue': 'vue',
      'svelte': 'svelte'
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const handleVerifyApiKey = async () => {
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
        toast.success("🎉 API Key verified! Ready to build amazing projects!")
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

  const parseFileOperations = (content: string): FileOperation[] => {
    const operations: FileOperation[] = [];
    
    // Enhanced regex patterns for file operations with folder support
    const createFilePattern = /```(\w+)?\s*(?:\/\/\s*)?(?:CREATE|create)\s+(.+?)\n([\s\S]*?)```/gi;
    const updateFilePattern = /```(\w+)?\s*(?:\/\/\s*)?(?:UPDATE|update)\s+(.+?)\n([\s\S]*?)```/gi;
    const deleteFilePattern = /(?:DELETE|delete)\s+(?:file\s+)?(.+?)(?:\n|$)/gi;
    const createFolderPattern = /(?:CREATE FOLDER|create folder|MKDIR|mkdir)\s+(.+?)(?:\n|$)/gi;

    let match;

    // Parse folder creation
    while ((match = createFolderPattern.exec(content)) !== null) {
      const folderPath = match[1].trim();
      operations.push({
        type: 'create-folder',
        path: `${PROJECT_FOLDER}/${folderPath}`,
        status: 'pending',
        description: `Creating folder: ${folderPath}`
      });
    }

    // Parse create operations
    while ((match = createFilePattern.exec(content)) !== null) {
      const language = match[1] || 'plaintext';
      let path = match[2].trim();
      const fileContent = match[3].trim();
      
      // Ensure files go into the project folder
      if (!path.startsWith(PROJECT_FOLDER)) {
        path = `${PROJECT_FOLDER}/${path}`;
      }
      
      operations.push({
        type: 'create',
        path,
        content: fileContent,
        language,
        status: 'pending',
        description: `Creating ${path}`
      });
    }

    // Parse update operations
    while ((match = updateFilePattern.exec(content)) !== null) {
      const language = match[1] || 'plaintext';
      let path = match[2].trim();
      const fileContent = match[3].trim();
      
      if (!path.startsWith(PROJECT_FOLDER)) {
        path = `${PROJECT_FOLDER}/${path}`;
      }
      
      operations.push({
        type: 'update',
        path,
        content: fileContent,
        language,
        status: 'pending',
        description: `Updating ${path}`
      });
    }

    // Parse delete operations
    while ((match = deleteFilePattern.exec(content)) !== null) {
      let path = match[1].trim();
      
      if (!path.startsWith(PROJECT_FOLDER)) {
        path = `${PROJECT_FOLDER}/${path}`;
      }
      
      operations.push({
        type: 'delete',
        path,
        status: 'pending',
        description: `Deleting ${path}`
      });
    }

    return operations;
  };

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
    setIsAISending(true)
    setIsGenerating(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = "60px"
    }
    
    // Enhanced system prompt for file operations with folder organization
    const systemPrompt = `You are an expert coding assistant that creates complete projects with proper folder structure. When responding to user requests:

1. For file creation, use this format:
\`\`\`javascript
// CREATE src/components/Button.tsx
import React from 'react';

export const Button = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};
\`\`\`

2. For folder creation, use:
CREATE FOLDER src/components
CREATE FOLDER public/images

3. For file updates, use:
\`\`\`javascript
// UPDATE src/App.tsx
import { Button } from './components/Button';

function App() {
  return <div><Button>Click me</Button></div>;
}
\`\`\`

4. For file deletion, use:
DELETE src/old-file.js

Always organize files in proper folder structures. Create folders first, then files. All files will be automatically placed in the "ai-project" folder. Provide complete, working code with proper imports and exports.

Current project structure: ${files.map(f => f.path).join(', ')}`;

    const conversationHistory: GeminiContent[] = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages
        .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && !msg.isTyping))
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }))
    ];
    
    const apiPayloadContents: GeminiContent[] = [
        ...conversationHistory,
        { role: 'user', parts: [{ text: currentInput }] }
    ];

    const aiMessageId = (Date.now() + 1).toString();

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

      // Parse file operations from the response
      const fileOperations = parseFileOperations(aiResponseContent);

      // Add the AI message with typing effect and file operations
      const placeholderAiMessage: MessageType = {
        id: aiMessageId,
        role: "assistant",
        content: aiResponseContent,
        timestamp: new Date(),
        isTyping: true,
        fileOperations: fileOperations.length > 0 ? fileOperations : undefined,
      };
      
      setMessages((prev) => [...prev, placeholderAiMessage]);

    } catch (error: any) {
      console.error("Error sending message to Gemini:", error)
      const errorMessage = `Sorry, I encountered an error: ${error.message || "Could not connect to the AI service."}`;
      toast.error(errorMessage, { duration: 7000 })
      
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: "assistant",
        content: errorMessage,
        timestamp: new Date(),
        isTyping: false
      }]);
    } finally {
      setIsAISending(false);
      setIsGenerating(false);
    }
  }, [inputValue, activeApiKey, selectedModel, messages, files, onFileCreate, onFileUpdate, onFileDelete])

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
        content: "🚀 Chat cleared! Ready to build something amazing? Just describe your project and I'll create it with live file animations!",
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
    const codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*)?(?:(CREATE|UPDATE|create|update)\s+(.+?))?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];
  
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || "";
      const operation = match[2]?.toUpperCase();
      const filePath = match[3];
      const code = match[4];
      const offset = match.index;
  
      // Add text part before the code block
      if (offset > lastIndex) {
        elements.push(
          <p key={`${messageId}-text-${lastIndex}`} className="whitespace-pre-wrap">
            {content.substring(lastIndex, offset)}
          </p>
        );
      }
  
      // Add enhanced code block with file operation info
      const codeBlockId = `${messageId}-code-${offset}`;
      const highlightedCode = hljs.highlight(code.trim(), {
        language: language || 'plaintext',
        ignoreIllegals: true
      }).value;

      elements.push(
        <div key={codeBlockId} className="ai-chat-code-block relative my-3 rounded-lg bg-muted/70 font-mono text-sm group/codeblock border">
          <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border flex justify-between items-center bg-muted/30">
            <div className="flex items-center space-x-2">
              {operation && filePath && (
                <Badge variant={operation === 'CREATE' ? 'default' : 'secondary'} className="text-xs">
                  {operation === 'CREATE' ? <FilePlus className="w-3 h-3 mr-1" /> : <FileCode className="w-3 h-3 mr-1" />}
                  {operation} {filePath}
                </Badge>
              )}
              {!operation && <span>{language || "code"}</span>}
              {currentlyTypingFile === filePath && (
                <Badge variant="outline" className="text-xs animate-pulse">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Typing...
                </Badge>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-50 group-hover/codeblock:opacity-100 transition-opacity"
              onClick={() => copyToClipboard(code, codeBlockId)}
              title="Copy code"
            >
              {copiedId === codeBlockId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <pre className="p-4 overflow-x-auto">
            <code
              className={cn("hljs", language && `language-${language}`)}
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
  }, [copiedId, currentlyTypingFile]);

  const renderFileOperations = (operations: FileOperation[]) => {
    if (!operations || operations.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center">
          <Wand2 className="w-4 h-4 mr-2" />
          File Operations:
        </h4>
        {operations.map((op, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center space-x-2 flex-1">
              {op.type === 'create' && <FilePlus className="w-4 h-4 text-green-500" />}
              {op.type === 'create-folder' && <FolderPlus className="w-4 h-4 text-blue-500" />}
              {op.type === 'update' && <FileCode className="w-4 h-4 text-blue-500" />}
              {op.type === 'delete' && <Trash className="w-4 h-4 text-red-500" />}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono truncate">{op.path}</span>
                  {currentlyTypingFile === op.path && (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Live typing...
                    </Badge>
                  )}
                </div>
                {op.description && (
                  <p className="text-xs text-muted-foreground">{op.description}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant={
                  op.status === 'completed' ? 'default' :
                  op.status === 'error' ? 'destructive' :
                  op.status === 'in-progress' ? 'secondary' : 'outline'
                } className="text-xs">
                  {op.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {op.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                  {op.status === 'in-progress' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {op.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                  {op.status}
                </Badge>
              </div>
            </div>
            {op.status === 'in-progress' && op.progress !== undefined && (
              <Progress value={op.progress} className="w-24" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-3 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold flex items-center">
          <Wand2 className="mr-2 h-5 w-5" />
          AI Project Builder
        </h2>
        <div className="flex items-center space-x-2">
          {isGenerating && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Building...</span>
            </div>
          )}
          {currentlyTypingFile && (
            <Badge variant="outline" className="text-xs animate-pulse">
              <FileCode className="w-3 h-3 mr-1" />
              Typing: {currentlyTypingFile.split('/').pop()}
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
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
                className={cn("p-4 rounded-lg mb-4 border", message.role === "user" ? "bg-muted/40 ml-8" : "bg-muted/20 mr-8")}
              >
                <div className="flex items-center mb-2">
                  {message.role === "assistant" ? (
                    <Bot className="h-5 w-5 mr-2 text-primary" />
                  ) : (
                    <User className="h-5 w-5 mr-2 text-primary" />
                  )}
                  <span className="text-sm font-medium">
                    {message.role === "assistant" ? "AI Project Builder" : "You"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
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
                <div className="text-sm">
                  {formatMessageContent(message.content, message.id, message.isTyping && message.role === 'assistant')}
                </div>
                {message.fileOperations && renderFileOperations(message.fileOperations)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t border-border mt-auto shrink-0">
            <div className="flex flex-col space-y-3">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={activeApiKey && selectedModel ? "Describe your project: 'Create a React todo app' or 'Build a landing page with HTML and CSS'..." : "Set API Key and select model in Settings to start building."}
                className="min-h-[60px] max-h-[150px] resize-none"
                rows={1}
                disabled={!activeApiKey || !selectedModel || isAISending || messages.some(m => m.isTyping)}
              />
              <div className="flex justify-between items-center">
                <div className="flex space-x-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Quick templates (coming soon)" disabled>
                    <FilePlus className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Project scaffolding (coming soon)" disabled>
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isAISending || !activeApiKey || !selectedModel || messages.some(m => m.isTyping)}
                  className="flex items-center"
                >
                  {isAISending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Build Project
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-0 px-3 pt-1.5 pb-3 space-y-3 flex-1 overflow-y-auto">
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
              Gemini API key is required for AI project building with live file creation.
              {activeApiKey && <span className="ml-1 font-medium text-green-500">✅ Key is active.</span>}
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
              Select a Gemini model optimized for code generation and project building.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Project Structure</label>
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center space-x-2">
                <Folder className="w-4 h-4" />
                <span className="font-mono">{PROJECT_FOLDER}/</span>
                <Badge variant="outline" className="text-xs">AI Project Folder</Badge>
              </div>
              <p>All AI-generated files will be organized in the "{PROJECT_FOLDER}" folder with proper structure.</p>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-muted/20 p-2 rounded">
                {files.filter(f => f.path.startsWith(PROJECT_FOLDER)).length > 0 ? (
                  files.filter(f => f.path.startsWith(PROJECT_FOLDER)).map(file => (
                    <div key={file.id} className="flex items-center space-x-2 text-xs">
                      <FileText className="w-3 h-3" />
                      <span className="font-mono">{file.path}</span>
                      <Badge variant="outline" className="text-xs">{file.language}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">No AI-generated files yet. Start building!</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}