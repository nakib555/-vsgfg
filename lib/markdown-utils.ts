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
    if (separatorParts.length !== headerCells.length && separatorParts.length > 0) { // Allow for tables with just header and separator
        // If separator parts don't match header, but separator is valid, try to use header cell count
        // This is a bit of a guess for malformed tables.
    }


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
            // Pad dataCells if shorter than headerCells
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
        if (tableBlock.length > 0) { // Push previous non-table lines
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


/**
 * Applies very basic live highlighting for strings.
 * This is intended for use during typing animation before full Shiki processing.
 * It's not a full lexer and will have limitations (e.g., escaped quotes within strings).
 */
export function liveHighlightStrings(text: string): string {
  if (!text) return "";

  // IMPORTANT: Process longer delimiters first to avoid conflicts (e.g., ` before ')
  let highlightedText = text;

  // Backticks (Template Literals) - handle multiline and escaped backticks simply
  highlightedText = highlightedText.replace(
    /`([\s\S]*?)`/g,
    (match) => `<span class="live-string-backtick">${match}</span>`
  );

  // Double-quoted strings - handle escaped double quotes simply
  highlightedText = highlightedText.replace(
    /"((?:\\.|[^"\\])*)"/g,
    (match) => `<span class="live-string-double">${match}</span>`
  );
  
  // Single-quoted strings - handle escaped single quotes simply
  highlightedText = highlightedText.replace(
    /'((?:\\.|[^'\\])*)'/g,
    (match) => `<span class="live-string-single">${match}</span>`
  );
  
  return highlightedText;
}