// lib/html-utils.ts

/**
 * Safely escapes HTML to prevent XSS attacks
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Strips ANSI escape codes from a string.
 */
function stripAnsiCodes(text: string): string {
  if (typeof text !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

/**
 * Formats code with line numbers.
 * This function now only escapes HTML and wraps lines for display.
 */
export function formatCodeWithLineNumbers(code: string): string {
  if (!code) return "";
  const strippedCode = stripAnsiCodes(code);
  const escapedCode = escapeHtml(strippedCode);
  const lines = escapedCode.split("\n");
  return lines.map((line) => `<span class="line">${line || ' '}</span>`).join("\n");
}

/**
 * Processes terminal output.
 * This version strips ANSI, escapes HTML, and preserves line breaks.
 * It NO LONGER adds specific ps-* styling spans.
 */
export function formatTerminalOutput(rawOutput: string): string {
  if (rawOutput === null || rawOutput === undefined) return "";
  const textWithoutAnsi = stripAnsiCodes(String(rawOutput));
  const escapedText = escapeHtml(textWithoutAnsi);
  // Preserve line breaks by replacing \n with <br> or by wrapping lines in divs/spans
  // Using <br> is simpler for direct HTML injection.
  // If you want each line to be a block, you could split and wrap.
  // For now, let's ensure multi-line output is still displayed correctly.
  return escapedText.split('\n').join('<br />') || ' '; // Ensure even an empty line has some content for rendering
}