// components/sidebar-parts/settings-tab.tsx
"use client";

import React from "react";
import { TabsContent } from "@/components/ui"; // Consolidated import
import { SettingsInterface } from './settings-interface'; 
import type { EditorTheme } from '@/components/code-editor';
import type { BundledTheme as ShikiTheme } from 'shiki';

interface GeminiModel {
  id: string;
  name: string;
}

interface ThemeOption {
  name: string;
  value: string | ShikiTheme | EditorTheme;
}

interface SettingsTabProps {
  apiKeyInputValue: string;
  onApiKeyInputChange: (value: string) => void;
  onVerifyApiKey: () => void;
  isVerifyingApiKey: boolean;
  activeApiKey: string | null;
  availableModels: GeminiModel[];
  selectedModel: string;
  onModelChange: (value: string) => void;
  isLoadingModels: boolean;
  appTheme?: string;
  onAppThemeChange: (value: string) => void;
  selectedShikiTheme: ShikiTheme;
  onShikiThemeChange: (value: ShikiTheme) => void;
  shikiThemesList: ThemeOption[];
  selectedEditorTheme: EditorTheme;
  onEditorThemeChange: (value: EditorTheme) => void;
  editorThemesList: ThemeOption[];
  selectedTerminalTheme: string;
  onTerminalThemeChange: (value: string) => void;
  terminalThemesList: ThemeOption[];
  isTerminalInputDisabled: boolean; // Added from Sidebar
  setIsTerminalInputDisabled: (disabled: boolean) => void; // Added from Sidebar
}

export const SettingsTab: React.FC<SettingsTabProps> = (props) => {
  return (
    <TabsContent value="settings" className="mt-0 px-3 pb-3 space-y-3 overflow-y-auto">
      <SettingsInterface {...props} />
    </TabsContent>
  );
};