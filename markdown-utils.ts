// lib/markdown-utils.ts

/**
 * Converts various ASCII-art table formats to standard Markdown tables.
 * Handles:
 * 1. Simple pipe tables (e.g., | Head1 | Head2 |)
 * 2. Grid tables using +,-,| (e.g., +---+---+ \n | A | B | \n +---+---+)
 */
export function convertAsciiTableToMarkdown(text: string): string {
  const lines = text.split('\n');
  let outputLines: string[] = [];
  let tableBlock: string[] = [];
  let inPotentialTable = false;

  function processTableBlock(block: string[]): string[] {
    if (block.length < 2) return block; // Need at least a header-like line and a separator/data

    const isGridTable = block.some(line => line.trim().startsWith('+') && line.includes('-') && line.includes('+'));
    const isPipeTableSeparator = (line: string) => line.trim().startsWith('|') && /^[|:-\s]+$/.test(line.trim()) && line.trim().split('|').slice(1, -1).every(part => /^-{2,}/.test(part.trim().replace(/:/g, '')));

    if (isGridTable && block.length >=3) { // Grid tables typically need at least 3 lines (top border, header, mid/bottom border)
      return parseGridTable(block);
    } else if (block.length >= 2 && block[0].trim().startsWith('|') && isPipeTableSeparator(block[1])) {
      return parseSimplePipeTable(block);
    }
    return block;
  }

  function parseSimplePipeTable(block: string[]): string[] {
    const headerLine = block[0];
    const separatorLine = block[1];
    
    const headerCells = headerLine.split('|').slice(1, -1).map(cell => cell.trim());
    if (headerCells.length === 0) return block;

    const separatorParts = separatorLine.split('|').slice(1, -1).map(part => part.trim());
    // if (separatorParts.length !== headerCells.length && separatorParts.length > 0) { 
        // If separator parts don't match header, but separator is valid, try to use header cell count
    // }

    const columnAlignments = headerCells.map((_, idx) => {
        const part = separatorParts[idx] || '---'; // Default to '---' if separator is short
        const startsWithColon = part.startsWith(':');
        const endsWithColon = part.endsWith(':');
        if (startsWithColon && endsWithColon && part.length > 2) return ':---:';
        if (startsWithColon) return ':---';
        if (endsWithColon) return '---:';
        return '---';
    });

    const markdownTable = [`| ${headerCells.join(' | ')} |`, `| ${columnAlignments.join(' | ')} |`];
    for (let i = 2; i < block.length; i++) {
        if (block[i].trim().startsWith('|')) {
            const dataCells = block[i].split('|').slice(1, -1).map(cell => cell.trim());
            while(dataCells.length < headerCells.length) {
                dataCells.push('');
            }
            markdownTable.push(`| ${dataCells.slice(0, headerCells.length).join(' | ')} |`);
        } else {
            markdownTable.push(...block.slice(i)); 
            break;
        }
    }
    return markdownTable;
  }


  function parseGridTable(block: string[]): string[] {
    const rows: string[][] = [];
    let columnCount = 0;

    const dataLines = block.filter(line => line.trim().startsWith('|'));

    if (dataLines.length === 0) return block; 

    for (const line of dataLines) {
      const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
      if (cells.length > 0) {
        rows.push(cells);
        if (cells.length > columnCount) {
          columnCount = cells.length;
        }
      }
    }

    if (rows.length === 0 || columnCount === 0) return block; 

    const normalizedRows = rows.map(row => {
      while (row.length < columnCount) {
        row.push('');
      }
      return row.slice(0, columnCount);
    });

    const header = normalizedRows[0];
    const markdownTable = [`| ${header.join(' | ')} |`];
    
    const alignmentRow = Array(columnCount).fill(':---').join(' | ');
    markdownTable.push(`| ${alignmentRow} |`);

    for (let i = 1; i < normalizedRows.length; i++) {
      markdownTable.push(`| ${normalizedRows[i].join(' | ')} |`);
    }
    return markdownTable;
  }

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('|') || (trimmedLine.startsWith('+') && trimmedLine.includes('-'))) {
      if (!inPotentialTable) {
        if (tableBlock.length > 0) { 
          outputLines.push(...tableBlock);
          tableBlock = [];
        }
      }
      inPotentialTable = true;
      tableBlock.push(line);
    } else {
      if (inPotentialTable) {
        outputLines.push(...processTableBlock(tableBlock));
        tableBlock = [];
        inPotentialTable = false;
      }
      outputLines.push(line);
    }
  }

  if (inPotentialTable && tableBlock.length > 0) {
    outputLines.push(...processTableBlock(tableBlock));
  } else if (tableBlock.length > 0) { 
    outputLines.push(...tableBlock);
  }

  return outputLines.join('\n');
}


export function liveHighlightStrings(text: string): string {
  if (!text) return "";

  // 1. Protect triple backticks by replacing them with a unique placeholder.
  // Using a more unique placeholder to avoid accidental matches.
  const tripleBacktickPlaceholder = `___TRIPLE_BACKTICK_PLACEHOLDER_${Date.now()}___`;
  let highlightedText = text.replace(/```/g, tripleBacktickPlaceholder);

  // 2. Highlight double-quoted strings.
  highlightedText = highlightedText.replace(
    /"((?:\\.|[^"\\])*)"/g,
    (match) => `<span class="live-string-double">${match}</span>`
  );

  // 3. Highlight single-quoted strings.
  highlightedText = highlightedText.replace(
    /'((?:\\.|[^'\\])*)'/g,
    (match) => `<span class="live-string-single">${match}</span>`
  );

  // 4. Highlight single-backtick inline code.
  // This regex is designed to match `content` where `content` does not contain newlines or backticks,
  // and the surrounding backticks are truly single (not part of `` or ``` which are handled by placeholder).
  highlightedText = highlightedText.replace(
    // Explanation of this regex:
    // (?<!`) - Negative lookbehind: asserts that the character immediately preceding the first captured backtick is NOT a backtick.
    //         This helps ensure we're not starting in the middle of ` `` ` or ` ``` `.
    // (`): Captures the opening single backtick.
    // (?!`) - Negative lookahead: asserts that the character immediately following the first captured backtick is NOT a backtick.
    //         This helps ensure it's a single ` and not the start of ` `` `.
    // ([^`\n]+?): Captures the content. This matches one or more characters that are NOT a backtick (`) and NOT a newline (\n).
    //             The `+?` makes it non-greedy.
    // (?<!`) - Negative lookbehind for the closing backtick.
    // (`): Captures the closing single backtick.
    // (?!`) - Negative lookahead for the closing backtick.
    /(?<!`)(`)(?!`)([^`\n]+?)(?<!`)(`)(?!`)/g,
    (match) => `<span class="live-string-backtick">${match}</span>`
  );

  // 5. Restore triple backticks from the placeholder.
  // Escape the placeholder for use in RegExp if it contains special characters (though ours doesn't here).
  const escapedPlaceholder = tripleBacktickPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return highlightedText.replace(new RegExp(escapedPlaceholder, 'g'), "```");
}

export function liveHighlightMath(text: string): string {
  if (!text) return "";
  let highlightedText = text;

  // Block math: $$ ... $$ (captures content between $$)
  // Ensure it doesn't greedily consume multiple blocks if AI types $$ ... $$ ... $$
  highlightedText = highlightedText.replace(
    /(\$\$)([\s\S]*?)(\$\$)/g,
    (match, p1, p2, p3) => {
      // p1 is $$, p2 is content, p3 is $$
      return `<span class="live-math-block-delimiter">${p1}</span><span class="live-math-block-content">${p2}</span><span class="live-math-block-delimiter">${p3}</span>`;
    }
  );

  // Inline math: $ ... $ (captures content between non-escaped $)
  // This regex attempts to be more careful:
  // - (?<!\$): Negative lookbehind to ensure the first $ is not part of a $$
  // - (?<!\\)\$: Matches a $ not preceded by a backslash (to allow \$ in text)
  // - ([^$\n]+?): Non-greedy match for content that is not a $ or a newline.
  // - (?<!\\)\$: Matches the closing $ not preceded by a backslash.
  // - (?!\$): Negative lookahead to ensure the closing $ is not part of a $$
  highlightedText = highlightedText.replace(
    /(?<!\$)(?<!\\)\$([^$\n]+?)(?<!\\)\$(?!\$)/g,
    (match, p1) => {
      return `<span class="live-math-inline-delimiter">$</span><span class="live-math-inline-content">${p1}</span><span class="live-math-inline-delimiter">$</span>`;
    }
  );
  
  return highlightedText;
}