import { cn } from "@/lib/utils"

/**
 * Creates a dynamic class for code editor themes
 */
export function getEditorThemeClass(theme: string, language: string): string {
  const baseClass = "p-4 h-full overflow-auto font-mono text-sm"

  // Theme-specific classes
  const themeClasses = {
    dark: "bg-gray-900 text-gray-100",
    light: "bg-white text-gray-800",
    "github-dark": "bg-[#0d1117] text-[#c9d1d9]",
    "github-light": "bg-[#ffffff] text-[#24292f]",
    "vscode-dark": "bg-[#1e1e1e] text-[#d4d4d4]",
    monokai: "bg-[#272822] text-[#f8f8f2]",
  } as const

  // Language-specific classes
  const languageClasses = {
    javascript: "js-syntax",
    typescript: "ts-syntax",
    html: "html-syntax",
    css: "css-syntax",
    json: "json-syntax",
    markdown: "md-syntax",
    plaintext: "plaintext-syntax",
  } as const

  // Get the theme class or default to dark
  const themeClass = themeClasses[theme as keyof typeof themeClasses] || themeClasses.dark

  // Get the language class or default to plaintext
  const langClass = languageClasses[language as keyof typeof languageClasses] || languageClasses.plaintext

  return cn(baseClass, themeClass, langClass)
}

/**
 * Creates a dynamic class for terminal themes
 */
export function getTerminalThemeClass(theme: string): string {
  const baseClass = "h-[calc(100%-32px)] font-mono text-sm overflow-auto p-2"

  // Theme-specific classes
  const themeClasses = {
    dark: "bg-gray-900 text-gray-100",
    light: "bg-gray-100 text-gray-800",
    ubuntu: "bg-[#300a24] text-[#ffffff]",
    powershell: "bg-[#012456] text-[#ffffff]",
    cmd: "bg-black text-white",
    matrix: "bg-black text-green-500",
  } as const

  // Get the theme class or default to dark
  const themeClass = themeClasses[theme as keyof typeof themeClasses] || themeClasses.dark

  return cn(baseClass, themeClass)
}
