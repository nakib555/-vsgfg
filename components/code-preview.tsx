// components/code-preview.tsx
"use client"

import React from 'react';
// Removed: import { Eye } from 'lucide-react'; // Not used directly here for the message

interface CodePreviewProps {
  htmlContent?: string;
  cssContent?: string;
  jsContent?: string;
  language?: string; // This prop might determine if we even attempt to construct a complex srcDoc
}

const CodePreview: React.FC<CodePreviewProps> = ({
  htmlContent = '',
  cssContent = '',
  jsContent = '',
  language = 'html' // Default to html if language is not provided
}) => {
  const constructSrcDoc = () => {
    // Only construct srcDoc with styles and scripts if there's web content to display
    if (language.toLowerCase() === 'html' || language.toLowerCase() === 'javascript' || language.toLowerCase() === 'css') {
      if (htmlContent || cssContent || jsContent) {
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                /* Basic reset and theme-aware body */
                body { 
                  margin: 0; 
                  padding: 8px; /* Add some padding inside the iframe */
                  font-family: sans-serif; /* Default font */
                  background-color: var(--background); 
                  color: var(--foreground);
                  transition: background-color 0.2s, color 0.2s; /* Smooth theme transitions */
                }
                /* Inject user's CSS */
                ${cssContent}
              </style>
            </head>
            <body>
              ${htmlContent}
              ${jsContent ? `<script type="module">${jsContent}</script>` : ''} 
            </body>
          </html>
        `;
      }
    }
    // Fallback for non-web content or if no web content is provided
    // This message is now styled using CSS variables from the parent document (via iframe inheritance or injected styles)
    // The actual styling for this fallback is handled by the parent (editor-area.tsx) when it generates this minimal HTML
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              font-family: var(--font-ui, sans-serif); /* Use UI font */
              background-color: var(--background); 
              color: var(--muted-foreground); /* Use muted foreground for placeholder */
              text-align: center;
              padding: 1rem;
              box-sizing: border-box;
            }
            .message-content {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .icon { /* Placeholder for a potential icon if you add one via JS */
              width: 48px;
              height: 48px;
              margin-bottom: 1rem;
              opacity: 0.3;
            }
          </style>
        </head>
        <body>
          <div class="message-content">
            <!-- You could use an SVG directly here or an img tag if you have an icon -->
            <!-- For simplicity, we'll rely on the parent component's placeholder if this srcDoc is shown -->
            <p>No preview available for this file type or content.</p>
            <p style="font-size: 0.8rem;">Run an HTML, CSS, or JS file to see its preview.</p>
          </div>
        </body>
      </html>`;
  };

  const srcDoc = constructSrcDoc();

  return (
    <div className="w-full h-full bg-background"> {/* Ensure this container uses theme background */}
      <iframe
        srcDoc={srcDoc}
        title="Code Preview"
        sandbox="allow-scripts allow-same-origin" // allow-same-origin is important for scripts to potentially access parent styles if needed, but be cautious
        className="w-full h-full border-none"
      />
    </div>
  );
};

export default CodePreview;