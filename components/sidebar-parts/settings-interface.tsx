// components/sidebar-parts/settings-interface.tsx
"use client";

import React from "react";
import { 
  Input, 
  Button, 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, 
  Switch, 
  Label 
} from "@/components/ui"; // Consolidated imports
import { AlertCircle, Palette, MonitorPlay, Terminal as TerminalLucideIcon, Sun, Moon, Laptop, Paintbrush, ShieldCheck, ShieldOff } from "lucide-react";
import type { EditorTheme } from '@/components/code-editor';
import type { BundledTheme } from 'shiki';


interface GeminiModel {
  id: string;
  name: string;
}

interface ThemeOption {
  name: string;
  value: string | BundledTheme | EditorTheme;
}

interface SettingsInterfaceProps {
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
  selectedShikiTheme: BundledTheme;
  onShikiThemeChange: (value: BundledTheme) => void;
  shikiThemesList: ThemeOption[];
  selectedEditorTheme: EditorTheme;
  onEditorThemeChange: (value: EditorTheme) => void;
  editorThemesList: ThemeOption[];
  selectedTerminalTheme: string;
  onTerminalThemeChange: (value: string) => void;
  terminalThemesList: ThemeOption[];
  isTerminalInputDisabled: boolean;
  setIsTerminalInputDisabled: (disabled: boolean) => void;
}

export const SettingsInterface: React.FC<SettingsInterfaceProps> = ({
  apiKeyInputValue,
  onApiKeyInputChange,
  onVerifyApiKey,
  isVerifyingApiKey,
  activeApiKey,
  availableModels,
  selectedModel,
  onModelChange,
  isLoadingModels,
  appTheme,
  onAppThemeChange,
  selectedShikiTheme,
  onShikiThemeChange,
  shikiThemesList,
  selectedEditorTheme,
  onEditorThemeChange,
  editorThemesList,
  selectedTerminalTheme,
  onTerminalThemeChange,
  terminalThemesList,
  isTerminalInputDisabled,
  setIsTerminalInputDisabled,
}) => {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="apiKeyInput" className="text-sm font-medium"> {/* Changed from label to Label */}
          Gemini API Key
        </Label>
        <div className="flex items-center space-x-2">
          <Input
            id="apiKeyInput"
            type="password"
            value={apiKeyInputValue}
            onChange={(e) => onApiKeyInputChange(e.target.value)}
            placeholder="Enter your Gemini API Key"
            disabled={isVerifyingApiKey}
            onKeyDown={(e) => {
              if (e.key === "Enter") onVerifyApiKey();
            }}
          />
          <Button
            onClick={onVerifyApiKey}
            disabled={isVerifyingApiKey || !apiKeyInputValue.trim()}
            className="shrink-0"
          >
            {isVerifyingApiKey ? "Verifying..." : "Set & Load"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Gemini API key is required. Get yours from Google AI Studio.
          {activeApiKey && (
            <span className="ml-1 font-medium text-green-500">
              Key is active.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="modelSelect" className="text-sm font-medium"> {/* Changed from label to Label */}
          AI Model
        </Label>
        <Select
          value={selectedModel}
          onValueChange={onModelChange}
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
                {model.name} ({model.id.split("/").pop()})
              </SelectItem>
            ))}
            {availableModels.length === 0 &&
              !isLoadingModels &&
              activeApiKey && (
                <div className="p-2 text-sm text-muted-foreground flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" /> No compatible models
                  found or API key invalid.
                </div>
              )}
            {availableModels.length === 0 &&
              !isLoadingModels &&
              !activeApiKey && (
                <div className="p-2 text-sm text-muted-foreground flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" /> Set API key to load
                  models.
                </div>
              )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Select a Gemini model for chat.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="appThemeSelect" className="text-sm font-medium flex items-center"> {/* Changed from label to Label */}
          <Paintbrush className="w-4 h-4 mr-2" /> App Theme
        </Label>
        <Select
          value={appTheme || "system"}
          onValueChange={onAppThemeChange}
        >
          <SelectTrigger id="appThemeSelect">
            <SelectValue placeholder="Select app theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <div className="flex items-center">
                <Sun className="w-4 h-4 mr-2" /> Light
              </div>
            </SelectItem>
            <SelectItem value="dark">
              <div className="flex items-center">
                <Moon className="w-4 h-4 mr-2" /> Dark
              </div>
            </SelectItem>
            <SelectItem value="system">
              <div className="flex items-center">
                <Laptop className="w-4 h-4 mr-2" /> System
              </div>
            </SelectItem>
            <SelectItem value="midnight-blue">
              <div className="flex items-center">
                <Moon className="w-4 h-4 mr-2" /> Midnight Blue
              </div>
            </SelectItem>
            <SelectItem value="sandstone">
              <div className="flex items-center">
                <Sun className="w-4 h-4 mr-2" /> Sandstone
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controls the overall application theme.
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="codeBlockThemeSelect"
          className="text-sm font-medium flex items-center"
        >
          <Palette className="w-4 h-4 mr-2" /> AI Chat Code Theme
        </Label>
        <Select
          value={selectedShikiTheme}
          onValueChange={(value) => onShikiThemeChange(value as BundledTheme)}
        >
          <SelectTrigger id="codeBlockThemeSelect">
            <SelectValue placeholder="Select AI code theme" />
          </SelectTrigger>
          <SelectContent>
            {shikiThemesList.map((themeOption) => (
              <SelectItem key={String(themeOption.value)} value={String(themeOption.value)}>
                {themeOption.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Syntax highlighting for AI-generated code blocks in chat.
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="editorThemeSelect"
          className="text-sm font-medium flex items-center"
        >
          <MonitorPlay className="w-4 h-4 mr-2" /> Editor Theme
        </Label>
        <Select
          value={selectedEditorTheme}
          onValueChange={(value) => onEditorThemeChange(value as EditorTheme)}
        >
          <SelectTrigger id="editorThemeSelect">
            <SelectValue placeholder="Select editor theme" />
          </SelectTrigger>
          <SelectContent>
            {editorThemesList.map((themeOption) => (
              <SelectItem key={String(themeOption.value)} value={String(themeOption.value)}>
                {themeOption.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Theme for the main code editor.
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="terminalThemeSelect"
          className="text-sm font-medium flex items-center"
        >
          <TerminalLucideIcon className="w-4 h-4 mr-2" /> Terminal Theme
        </Label>
        <Select
          value={selectedTerminalTheme}
          onValueChange={onTerminalThemeChange}
        >
          <SelectTrigger id="terminalThemeSelect">
            <SelectValue placeholder="Select terminal theme" />
          </SelectTrigger>
          <SelectContent>
            {terminalThemesList.map((themeOption) => (
              <SelectItem key={String(themeOption.value)} value={String(themeOption.value)}>
                {themeOption.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Appearance of the integrated terminal.
        </p>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="terminal-input-switch" className="text-sm font-medium flex items-center">
          {isTerminalInputDisabled ? <ShieldOff className="w-4 h-4 mr-2 text-destructive" /> : <ShieldCheck className="w-4 h-4 mr-2 text-success" />}
          Terminal Input
        </Label>
        <div className="flex items-center space-x-2">
          <Switch
            id="terminal-input-switch"
            checked={!isTerminalInputDisabled}
            onCheckedChange={(checked) => setIsTerminalInputDisabled(!checked)}
          />
          <span className="text-xs text-muted-foreground">
            {isTerminalInputDisabled ? "Input Disabled (AI cannot run commands)" : "Input Enabled (AI can run commands)"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Toggle user and AI ability to execute commands in the terminal.
        </p>
      </div>
    </>
  );
};