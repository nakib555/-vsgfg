
/**
 * Safely escapes HTML to prevent XSS attacks
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Adds syntax highlighting to code based on language
 */
export function highlightCode(code: string, language: string): string {
  // This is a simple implementation
  // In a real app, you would use a library like Prism.js or highlight.js

  if (!code) return ""

  // Basic syntax highlighting for JavaScript/TypeScript
  if (language === "javascript" || language === "typescript" || language === "jsx" || language === "tsx") {
    return (
      code
        // Highlight keywords
        .replace(
          /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|super|extends|implements)\b/g,
          '<span style="color: hsl(var(--code-keyword));">$1</span>',
        )
        // Highlight strings
        .replace(/(["'`])(.*?)\1/g, '<span style="color: hsl(var(--code-string));">$1$2$1</span>')
        // Highlight comments
        .replace(/\/\/(.*)/g, '<span style="color: hsl(var(--code-comment));">//$1</span>')
        // Highlight numbers
        .replace(/\b(\d+)\b/g, '<span style="color: hsl(var(--code-number));">$1</span>')
    )
  }

  // Basic syntax highlighting for HTML
  if (language === "html" || language === "xml") {
    return (
      code
        // Highlight tags
        .replace(/(&lt;[/]?)([a-zA-Z0-9]+)/g, '$1<span style="color: hsl(var(--code-tag));">$2</span>')
        // Highlight attributes
        .replace(/\s([a-zA-Z0-9-]+)=/g, ' <span style="color: hsl(var(--code-attribute));">$1</span>=')
        // Highlight strings
        .replace(/=(&quot;|')(.*?)(&quot;|')/g, '=<span style="color: hsl(var(--code-string));">$1$2$3</span>')
    )
  }

  // Basic syntax highlighting for CSS
  if (language === "css") {
    return (
      code
        // Highlight selectors
        .replace(/([.#]?[a-zA-Z0-9_-]+)\s*\{/g, '<span style="color: hsl(var(--code-keyword));">$1</span> {')
        // Highlight properties
        .replace(/\b([a-zA-Z-]+):/g, '<span style="color: hsl(var(--code-attribute));">$1</span>:')
        // Highlight values
        .replace(/:\s*([^;]+);/g, ': <span style="color: hsl(var(--code-string));">$1</span>;')
    )
  }

  // For other languages, just escape HTML
  return escapeHtml(code)
}

/**
 * Formats code with line numbers
 */
export function formatCodeWithLineNumbers(code: string, language: string): string {
  if (!code) return ""

  const escapedCode = escapeHtml(code)
  const highlightedCode = highlightCode(code, language) // Pass raw code, highlightCode will escape internally
  const lines = highlightedCode.split("\n")
  
  return lines.map((line) => `<span class="line">${line}</span>`).join("\n")
}

/**
 * Processes terminal output to add styling
 */
export function formatTerminalOutput(output: string): string {
  if (!output) return ""

  const escapedOutput = escapeHtml(output)

  // Add styling for common terminal patterns
  return (
    escapedOutput
      // Style success messages
      .replace(/success|completed|done/gi, '<span class="ps-success">$&</span>')
      // Style error messages
      .replace(/error|failed|fatal/gi, '<span class="ps-error">$&</span>')
      // Style warning messages
      .replace(/warning|caution|note/gi, '<span class="ps-warning">$&</span>')
      // Style file paths
      .replace(/([/\\][a-zA-Z0-9_.-]+)+/g, '<span class="ps-info">$&</span>')
      // Style URLs
      .replace(/(https?:\/\/[^\s]+)/g, '<span class="ps-info underline">$&</span>')
  )
}