/**
 * Markdown preprocessor: convert Obsidian wikilinks to Pandoc-compatible format
 * for use with BBT's zotero.lua filter.
 */

export interface CitationInfo {
  key: string;        // Zotero item key (e.g., "FLBB3YEH")
  alias: string;      // Display text (e.g., "Zhang et al., 2018, ESR")
  filename: string;   // Full filename without .md
  citekey: string;    // BBT citation key (e.g., "zhang2018-FLBB3YEH")
  fullMatch: string;  // Original wikilink
}

/**
 * Extract all Zotero citations from markdown content.
 * Pattern: [[..._KEY-XXXXXXXX|alias]]
 */
export function extractCitations(content: string): CitationInfo[] {
  const regex = /\[\[([^\]]*?_KEY-([A-Z0-9]{8}))\|([^\]]+?)\]\]/g;
  const citations: CitationInfo[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const filename = match[1];
    const key = match[2];
    const alias = match[3];
    const citekey = wikilinkToCitekey(filename);

    citations.push({
      key,
      alias,
      filename,
      citekey,
      fullMatch: match[0],
    });
  }

  return citations;
}

/**
 * Convert a Zotero One filename to a BBT citation key.
 *
 * Filename format: {year}_{firstAuthor}_{title_KEY-{itemKey}}
 * BBT citekey:    {author}.toLowerCase() + {year} + '-' + {itemKey}
 *
 * Examples:
 *   "2018_Zhang_Holocene climate var_KEY-FLBB3YEH" -> "zhang2018-FLBB3YEH"
 *   "2023_陈发虎_全新世温度大暖期模式_KEY-4NX85H85" -> "陈发虎2023-4NX85H85"
 */
export function wikilinkToCitekey(filename: string): string {
  const parts = filename.split('_');
  if (parts.length < 2) return filename;

  const year = parts[0];
  const author = parts[1].toLowerCase()
    .replace(/\s+/g, '')           // remove spaces
    .replace(/[''']/g, '');        // remove all apostrophe variants: ' (U+0027) ' (U+2018) ' (U+2019)

  const keyMatch = filename.match(/KEY-([A-Z0-9]{8})/);
  if (!keyMatch) return filename;

  const key = keyMatch[1];
  return author + year + '-' + key;
}

/**
 * Extract itemKey (8-char ID) from a filename.
 */
export function extractItemKey(filename: string): string {
  const match = filename.match(/KEY-([A-Z0-9]{8})/);
  return match ? match[1] : filename;
}

/**
 * Generate YAML frontmatter for Pandoc with zotero.lua configuration.
 */
export function generateFrontmatter(cslStyle?: string): string {
  let meta = '---\nzotero_client: zotero\n';
  if (cslStyle) {
    meta += `zotero_csl-style: ${cslStyle}\n`;
  }
  meta += '---\n\n';
  return meta;
}

/**
 * Convert Obsidian wikilinks to Pandoc format.
 * - Citation wikilinks -> @citekey syntax (for zotero.lua)
 * - Regular wikilinks -> plain text
 * - Image embeds -> standard markdown images
 */
export function preprocessMarkdown(
  content: string,
  cslStyle?: string,
  mode: 'bbt' | 'lite' = 'bbt',
  bbtCitekeyMap?: Record<string, string>
): string {
  // Choose citekey strategy based on mode
  const getCitekey = (filename: string): string => {
    if (mode === 'lite') {
      return extractItemKey(filename);
    }
    // BBT mode
    if (bbtCitekeyMap) {
      const itemKey = extractItemKey(filename);
      const mapped = bbtCitekeyMap[itemKey];
      if (mapped) return mapped;
    }
    // Fallback: local construction
    return wikilinkToCitekey(filename);
  };

  let result = content;

  // 0. Remove existing YAML frontmatter (we'll add our own)
  result = result.replace(/^---\n[\s\S]*?\n---\n/, '');

  // 1. Process parenthesized citation groups first
  // Match ( ... ) or （ ... ） that contain citation wikilinks
  // All [[wikilink]] inside the same parentheses become one [@a; @b; @c] group
  const parenRegex = /([（(])([^）)]*?\[\[[^\]]*?_KEY-[A-Z0-9]{8}[^\]]*?\][^）)]*?)([)）])/g;
  result = result.replace(parenRegex, (_match: string, _open: string, inner: string, _close: string) => {
    // Convert all [[wikilinks]] inside parentheses to [@citekey] and merge
    let citekeys: string[] = [];
    inner.replace(
      /\[\[([^\]]*?_KEY-([A-Z0-9]{8}))\|([^\]]+?)\]\]/g,
      (_m: string, filename: string) => {
        citekeys.push(getCitekey(filename));
        return '';
      }
    );
    if (citekeys.length === 0) return _match; // No citations found
    return '[@' + citekeys.join('; @') + ']';
  });

  // 2. Convert remaining citation wikilinks outside parentheses
  // These are standalone citations not inside any parentheses
  result = result.replace(
    /\[\[([^\]]*?_KEY-([A-Z0-9]{8}))\|([^\]]+?)\]\]/g,
    (_match: string, filename: string) => {
      return '[@' + getCitekey(filename) + ']';
    }
  );

  // 3. Convert regular wikilinks to plain text
  // [[Page Name]] -> Page Name
  // [[Page Name|Display]] -> Display
  result = result.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (match, page, display) => {
    return display || page;
  });

  // 4. Convert image embeds to standard markdown
  // ![[image.png]] -> ![](image.png)
  // ![[image.png|200]] -> ![](image.png){ width=200 }
  result = result.replace(/!\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (match, file, size) => {
    if (size) {
      return '![](' + file + '){ width=' + size + ' }';
    }
    return '![](' + file + ')';
  });

  // 5. Convert Obsidian callouts to blockquotes
  result = result.replace(
    /^>\s*\[!(\w+)\]\s*(.*)$/gm,
    (match, type, title) => {
      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      return '> **' + capitalizedType + '**: ' + title;
    }
  );

  // 6. Prepend YAML frontmatter
  result = generateFrontmatter(cslStyle) + result;

  // 7. Shift heading levels if needed (user uses ## as h1)
  // Convert ## -> #, ### -> ##, etc.
  result = result.replace(/^(\s*)##/gm, '$1#');

  return result.trim() + '\n';
}

/**
 * Build Pandoc command arguments for zotero.lua processing.
 */
export function buildPandocArgs(
  inputPath: string,
  outputPath: string,
  luaFilterPath: string,
  cslStyle?: string,
  templatePath?: string
): string[] {
  const args = [
    inputPath,
    '--from', 'markdown',
    '--to', 'docx',
    '--lua-filter', luaFilterPath,
  ];

  // zotero.lua reads these from YAML metadata, but command-line metadata overrides
  args.push('--metadata=zotero_client:zotero');

  if (cslStyle) {
    args.push('--metadata=zotero_csl-style:' + cslStyle);
  }

  // Custom Word template
  if (templatePath) {
    args.push('--reference-doc', templatePath);
  }

  args.push('-o', outputPath);

  return args;
}