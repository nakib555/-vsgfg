// components/sidebar-parts/settings-tab.tsx
"use client";

import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { SettingsInterface } from './settings-interface'; // Assuming settings-interface.tsx is in the same directory
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
}

export const SettingsTab: React.FC<SettingsTabProps> = (props) => {
  return (
    // इंश्योर करें कि यहां `flex-1` क्लास नहीं है
    <TabsContent value="settings" className="mt-0 px-3 pb-3 space-y-6 overflow-y-auto">
      <SettingsInterface {...props} />
    </TabsContent>
  );
};