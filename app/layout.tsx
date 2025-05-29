// app/layout.tsx
import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import "katex/dist/katex.min.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SonnerToaster as Toaster } from "@/components/ui"; // Updated import for SonnerToaster

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  title: "AI Coding Assistant",
  description: "A modern IDE with AI assistance for coding",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'system', 'midnight-blue', 'sandstone']}
        >
          <Toaster /> {/* This will now use the SonnerToaster from components/ui/feedback.tsx */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}