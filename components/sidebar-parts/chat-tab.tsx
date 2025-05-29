// components/sidebar-parts/chat-tab.tsx
"use client";

import React from "react";
import { TabsContent } from "@/components/ui"; // Consolidated import
import { ChatInterface, type MessageType } from './chat-interface';
import type { Highlighter, BundledTheme as ShikiTheme } from 'shiki';
import type { GeminiContent } from "@/components/sidebar"; // Assuming GeminiContent is exported from sidebar or a shared types file

interface ChatTabProps {
  messages: MessageType[];
  setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (isReprompt?: boolean, repromptHistory?: GeminiContent[]) => Promise<void>; // Matched signature from Sidebar
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


export const ChatTab: React.FC<ChatTabProps> = (props) => {
  return (
    <TabsContent value="chat" className="flex flex-col flex-1 overflow-y-hidden">
      <ChatInterface {...props} />
    </TabsContent>
  );
};