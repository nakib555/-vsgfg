// components/live-preview-block.tsx
"use client";

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes'; // To pass theme variables to iframe

interface LivePreviewBlockProps {
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
  className?: string;
  title?: string; // For iframe title attribute
  initialHeight?: string; // e.g., "200px", "auto"
}

const LivePreviewBlock: React.FC<LivePreviewBlockProps> = ({
  htmlContent,
  cssContent = '',
  jsContent = '',
  className,
  title = "Live AI Preview",
  initialHeight = "250px", // Default height
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<string | number>(initialHeight);
  const { theme: appTheme, resolvedTheme } = useTheme(); // Get app's theme

  // Construct the document for the iframe
  const srcDoc = useMemo(() => {
    // Basic theme variables to pass to the iframe for consistent styling
    // This is a simplified approach; a more robust solution might involve
    // dynamically generating a more complete theme stylesheet.
    const themeStyle = `
      <style id="app-theme-variables">
        :root {
          --background: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)'};
          --foreground: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)'};
          --card: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)'};
          --card-foreground: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)'};
          --popover: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)'};
          --popover-foreground: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)'};
          --primary: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)'};
          --primary-foreground: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(222.2 47.4% 11.2%)' : 'hsl(210 40% 98%)'};
          --secondary: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(210 40% 96.1%)'};
          --secondary-foreground: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)'};
          --muted: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(210 40% 96.1%)'};
          --muted-foreground: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)'};
          --accent: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(210 40% 96.1%)'};
          --accent-foreground: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)'};
          --destructive: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(0 62.8% 50.6%)' : 'hsl(0 84.2% 60.2%)'};
          --border: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)'};
          --input: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)'};
          --ring: ${resolvedTheme === 'dark' || appTheme === 'dark' || appTheme === 'midnight-blue' ? 'hsl(212.7 26.8% 83.9%)' : 'hsl(222.2 84% 4.9%)'};
          --font-ui: Inter, sans-serif; /* Fallback fonts */
          --font-mono: 'JetBrains Mono', monospace;
        }
        body {
          margin: 0;
          padding: 12px; /* Padding inside the iframe */
          font-family: var(--font-ui);
          background-color: var(--background);
          color: var(--foreground);
          box-sizing: border-box;
          height: 100%; /* Allow body to fill iframe for height calculation */
        }
        /* Ensure scripts run after DOM is ready */
        script { defer }
      </style>
      <style id="ai-provided-css">
        ${cssContent}
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${themeStyle}
        </head>
        <body>
          ${htmlContent}
          ${jsContent ? `<script>${jsContent}</script>` : ''}
        </body>
      </html>
    `;
  }, [htmlContent, cssContent, jsContent, appTheme, resolvedTheme]);

  // Auto-adjust iframe height based on its content
  useEffect(() => {
    if (initialHeight === "auto" && iframeRef.current) {
      const iframe = iframeRef.current;
      const handleLoad = () => {
        if (iframe.contentWindow && iframe.contentWindow.document.body) {
          const contentHeight = iframe.contentWindow.document.body.scrollHeight;
          setIframeHeight(contentHeight > 0 ? contentHeight + 24 : 100); // Add some padding, min height 100px
        }
      };
      iframe.addEventListener('load', handleLoad);
      // Trigger load manually if srcDoc is already set for initial calculation
      if (iframe.contentWindow && iframe.contentWindow.document.readyState === 'complete') {
        handleLoad();
      }
      return () => iframe.removeEventListener('load', handleLoad);
    } else if (initialHeight !== "auto") {
        setIframeHeight(initialHeight);
    }
  }, [srcDoc, initialHeight]); // Re-run if srcDoc changes for auto-height

  return (
    <div className={cn("ai-live-preview-block-container my-4 overflow-hidden rounded-md border border-border bg-background shadow-sm", className)}>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms" // Common sandbox attributes
        className="w-full border-none"
        style={{ height: iframeHeight }}
        scrolling={initialHeight === "auto" ? "no" : "auto"} // Disable scroll if auto-heighting, otherwise allow
      />
    </div>
  );
};

export default LivePreviewBlock;