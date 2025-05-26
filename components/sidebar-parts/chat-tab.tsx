// components/sidebar-parts/chat-tab.tsx
"use client";

import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { ChatInterface, type MessageType, type TypingState } from './chat-interface';
import type { Highlighter, BundledTheme as ShikiTheme } from 'shiki';

interface ChatTabProps {
  messages: MessageType[];
  typingStates: Record<string, TypingState>;
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


export const ChatTab: React.FC<ChatTabProps> = (props) => {
  return (
    <TabsContent value="chat" className="flex flex-col flex-1 overflow-y-hidden">
      <ChatInterface {...props} />
    </TabsContent>
  );
};