/**
 * Markdown preprocessor: convert Obsidian wikilinks to Pandoc-compatible format
 * for use with BBT's zotero.lua filter.
 */

import * as path from 'path';
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";

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
 * BBT citekey:    author.lower() + year + '-' + item (8-char Zotero item key)
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
    .replace(/['‘’]/g, ''); // remove all apostrophe variants: ' (U+0027) ' (U+2018) ' (U+2019)

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
export function generateFrontmatter(): string {
  return '---\nzotero_client: zotero\n---\n\n';
}

/**
 * Convert Obsidian wikilinks to Pandoc format.
 * - Citation wikilinks -> @citekey syntax (for zotero.lua)
 * - Regular wikilinks -> plain text
 * - Image embeds -> standard markdown images
 */
export function preprocessMarkdown(
  content: string,
  mode: 'bbt' | 'lite' = 'bbt',
  bbtCitekeyMap?: Record<string, string>
): string {
  const getCitekey = (filename: string): string => {
    if (mode === 'lite') {
      return extractItemKey(filename);
    }
    if (bbtCitekeyMap) {
      const itemKey = extractItemKey(filename);
      const mapped = bbtCitekeyMap[itemKey];
      if (mapped) return mapped;
    }
    return wikilinkToCitekey(filename);
  };

  let result = applyMarkdownTransformations(content, true);

  // 2. Process parenthesized citation groups (repeatedly until no more matches)
  let prev = '';
  while (prev !== result) {
    prev = result;
    // Simple approach: find all ( ... ) and （ ... ） pairs and process them
    const parenRegex = /([（\(])([^）\)]*)([\)）])/g;
    result = result.replace(parenRegex, (_match: string, _open: string, inner: string, _close: string) => {
      // Find all wikilinks in the inner content
      const wikilinkRegex = /\[\[([^\]]*?_KEY-([A-Z0-9]{8}))\|([^\]]+?)\]\]/g;
      let citekeys: string[] = [];
      let m;
      while ((m = wikilinkRegex.exec(inner)) !== null) {
        citekeys.push(getCitekey(m[1]));
      }
      if (citekeys.length === 0) return _match;
      return '[@' + citekeys.join('; @') + ']';
    });
  }

  // 3. Convert remaining citation wikilinks outside parentheses
  // These are standalone citations not inside any parentheses
  result = result.replace(
    /\[\[([^\]]*?_KEY-([A-Z0-9]{8}))\|([^\]]+?)\]\]/g,
    (_match: string, filename: string) => {
      return '[@' + getCitekey(filename) + ']';
    }
  );

  // 4. Convert remaining regular wikilinks to plain text (citations already handled)
  result = result.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (match, page, display) => {
    return display || page;
  });

  // 5. Prepend YAML frontmatter
  result = generateFrontmatter() + result;

  return result.trim() + '\n';
}

/**
 * Build Pandoc command arguments for zotero.lua processing.
 */
export function buildPandocArgs(
  inputPath: string,
  outputPath: string,
  luaFilterPath: string,
  templatePath?: string,
  crossrefOptions?: {
    figPrefix?: string;
    tblPrefix?: string;
    eqnPrefix?: string;
    figureTitle?: string;
    tableTitle?: string;
    equationTitle?: string;
    chapDelim?: string;
    autoSectionLabels?: boolean;
  },
  crossrefFilterPath?: string  // pandoc-crossref 可执行文件路径
): string[] {
  const args = [
    inputPath,
    '--from', 'markdown+yaml_metadata_block',
    '--to', 'docx',
    '--lua-filter', luaFilterPath,
  ];

  // zotero.lua reads these from YAML metadata, but command-line metadata overrides
  args.push('--metadata=zotero_client:zotero');


  // Custom Word template
  if (templatePath) {
    args.push('--reference-doc', templatePath);
  }

  // Crossref options (pandoc-crossref filter)
  if (crossrefOptions) {
    if (crossrefOptions.figPrefix) {
      args.push('--metadata=figPrefix:' + crossrefOptions.figPrefix);
    }
    if (crossrefOptions.tblPrefix) {
      args.push('--metadata=tblPrefix:' + crossrefOptions.tblPrefix);
    }
    if (crossrefOptions.eqnPrefix) {
      args.push('--metadata=eqnPrefix:' + crossrefOptions.eqnPrefix);
    }
    if (crossrefOptions.figureTitle) {
      args.push('--metadata=figureTitle:' + crossrefOptions.figureTitle);
    }
    if (crossrefOptions.tableTitle) {
      args.push('--metadata=tableTitle:' + crossrefOptions.tableTitle);
    }
    if (crossrefOptions.equationTitle) {
      args.push('--metadata=equationTitle:' + crossrefOptions.equationTitle);
    }
    if (crossrefOptions.chapDelim) {
      args.push('--metadata=chapDelim:' + crossrefOptions.chapDelim);
    }
    if (crossrefOptions.autoSectionLabels !== undefined) {
      args.push('--metadata=autoSectionLabels:' + String(crossrefOptions.autoSectionLabels));
    }
  }

  // pandoc-crossref filter
  if (crossrefFilterPath) {
    args.push('--filter', crossrefFilterPath);
  }

  args.push('-o', outputPath);

  return args;
}

/**
 * Resolve cross-references (@fig:xxx, @tbl:xxx, @eq:xxx → prefix + number).
 * Scans for {#fig:xxx} labels, assigns sequential numbers, replaces references.
 *
 * @param lang - 'zh' for Chinese format (图 1, 表1, 式 1), 'en' for English (Fig. 1, Tab. 1, Eq. 1)
 */
export function resolveCrossrefs(content: string, options?: {
  figPrefix?: string; tblPrefix?: string; eqnPrefix?: string;
  lang?: 'zh' | 'en';
}): string {
  const lang = options?.lang || 'en';

  // Build prefix map based on language
  const pref: Record<string, string> = {
    fig: lang === 'zh' ? '图' : (options?.figPrefix || 'Fig.'),
    tbl: lang === 'zh' ? '表' : (options?.tblPrefix || 'Tab.'),
    eq: lang === 'zh' ? '式' : (options?.eqnPrefix || 'Eq.'),
  };

  // Build sequential number map: fig:temp-curve -> 1, fig:temp-curve2 -> 2, etc.
  const numberMap: Record<string, number> = {};
  const numberCounters = { fig: 0, tbl: 0, eq: 0 };
  const labelPat = /\{#(fig|tbl|eq):([a-zA-Z0-9][a-zA-Z0-9-]*)\}/g;
  let m;
  while ((m = labelPat.exec(content)) !== null) {
    const key = `${m[1]}:${m[2]}`;
    if (!numberMap[key]) {
      numberCounters[m[1] as keyof typeof numberCounters]++;
      numberMap[key] = numberCounters[m[1] as keyof typeof numberCounters];
    }
  }

  // Replace @fig:xxx references with prefix + number
  // Handle sub-figure suffix: @fig:xxx a -> 图 1a
  let result = content.replace(/@(fig|tbl|eq):([a-zA-Z0-9][\w-]*)\s+([a-z])\b/g, (_m, type, label, suffix) => {
    const key = `${type}:${label}`;
    const num = numberMap[key];
    if (num) {
      // Chinese: 表1a (no space), English/Eq: Fig. 1a, Eq. 1a
      if (type === 'tbl' && lang === 'zh') {
        return `${pref[type]}${num}${suffix}`;
      }
      return `${pref[type]} ${num}${suffix}`;
    }
    return _m;
  });

  // Replace remaining @fig:xxx references (without suffix)
  result = result.replace(/@(fig|tbl|eq):([a-zA-Z0-9][\w-]*)\b/g, (_m, type, label) => {
    const key = `${type}:${label}`;
    const num = numberMap[key];
    if (num) {
      // Chinese: 表1 (no space), English/Eq: Fig. 1, Eq. 1
      if (type === 'tbl' && lang === 'zh') {
        return `${pref[type]}${num}`;
      }
      return `${pref[type]} ${num}`;
    }
    return _m;
  });

  return result;
}

/**
 * Shared markdown transformations used by both preprocessMarkdown and cleanMarkdown.
 * Handles: YAML frontmatter removal, image embeds, figure/table callouts,
 * wikilink conversion, callout→blockquote, heading shift.
 */
export function applyMarkdownTransformations(
  content: string,
  skipWikilinkConversion = false,
  footnotesMode = false,
  crossrefOptions?: { figPrefix?: string; tblPrefix?: string; eqnPrefix?: string }
): string {
  // Normalize line endings first
  let result = content.replace(/\r\n/g, '\n');

  // Remove existing YAML frontmatter
  result = result.replace(/^---\n[\s\S]*?\n---\n?/, '');

  // Replace standalone --- (horizontal rules) with *** to avoid pandoc YAML parsing issues
  result = result.replace(/^---\s*$/gm, '***');

  // 1. Convert image embeds to standard markdown FIRST (before frontmatter)
  // Wikilink syntax: ![[image.png|param]]
  result = result.replace(/!\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (match, file, param) => {
    if (!param) {
      return '![](' + file + ')';
    }
    const isSize = /^\d+$/.test(param.trim());
    if (isSize) {
      return footnotesMode ? '![](' + file + ')' : '![](' + file + '){ width=' + param.trim() + ' }';
    }
    const figLabel = path.basename(file, path.extname(file))
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
    return '![' + param.trim() + '](' + file + '){#fig:' + figLabel + '}';
  });

  // 1a. Convert standard markdown images with caption/size to crossref format
  // Pattern: ![caption|size](file) -> ![caption](file){ width=size } or ![caption](file){#fig:xxx}
  result = result.replace(/!\[([^\]]*?)\|(\d+)\]\(([^)]+)\)/g, (_match, caption, size, file) => {
    if (!caption) {
      // In footnotes mode, preserve size info as {width=N} for later processing
      if (footnotesMode) {
        return '![](' + file + '){width=' + size + '}';
      }
      return '![](' + file + '){ width=' + size + ' }';
    }
    return '![' + caption + '](' + file + '){ width=' + size + ' }';
  });

  // Pattern: ![caption](file) -> ![caption](file){#fig:xxx} (add fig label if caption is not empty)
  result = result.replace(/!\[([^\]]+?)\]\(([^)]+)\)(?!\{)/g, (_match, caption, file) => {
    if (caption && !caption.startsWith(' ')) {
      const figLabel = path.basename(file, path.extname(file))
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      return '![' + caption + '](' + file + '){#fig:' + figLabel + '}';
    }
    return _match;
  });

  // 1b. Convert figure callouts to pandoc figure with caption + annotation
  let figCounter = 0;
  result = result.replace(
    /^>\s*\[!figure\]\s*(.*)\n([\s\S]*?)^>\s*(!\[[^\]]*\]\([^)]+\)(?:\{[^}]+\})?)\s*$/gm,
    (_match: string, caption: string, annotationBlock: string, imageSyntax: string) => {
      figCounter++;
      // Extract optional custom label {#fig:xxx} from caption
      const labelMatch = caption.match(/\{#([\w:-]+)\}$/);
      const captionText = labelMatch ? caption.replace(/\s*\{#[\w:-]+\}$/, '') : caption;
      const figLabel = 'fig:' + figCounter;
      const annotation = annotationBlock
        .split('\n')
        .map((line: string) => line.replace(/^>\s?/, '').trim())
        .filter((line: string) => line !== '')
        .join('\n');
      // Extract URL from image syntax (may have > prefix from blockquote)
      const imgMatch = imageSyntax.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      const imgUrl = imgMatch ? imgMatch[2] : imageSyntax;

      if (footnotesMode) {
        // HTML format for footnotes export
        // Extract width from image syntax: ![[url|100]] or ![|100](url) or ![](url){width=100}
        const widthMatch = imageSyntax.match(/!\[\|(\d+)\]/) || imageSyntax.match(/\{width=(\d+)\}/);
        const widthAttr = widthMatch ? ` width = "${widthMatch[1]} px"` : '';

        let html = `<center><img src = "${imgUrl}"${widthAttr}/></center>\n`;
        const figPrefix = crossrefOptions?.figPrefix || '图';
        html += `<center><b>${figPrefix} ${figCounter} ${captionText.trim()}</b></center>`;
        if (annotation) {
          html += `\n<center><font color="#595959">${annotation}</font></center>`;
        }
        return html;
      }

      let r = '![' + captionText.trim() + '](' + imgUrl + '){#' + figLabel + '}';
      if (annotation) {
        r += '\n\n' + annotation;
      }
      return r;
    }
  );

  // 1c. Convert table callouts to pandoc table with caption + annotation
  let tableCounter = 0;
  const lines = result.split('\n');
  const processedLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const tableMatch = lines[i].match(/^>\s*\[!table\]\s*(.*)$/);
    if (tableMatch) {
      tableCounter++;
      const captionFull = tableMatch[1].trim();
      const labelMatch = captionFull.match(/\{#([\w:-]+)\}$/);
      const tblLabel = labelMatch ? labelMatch[1] : 'tbl:' + tableCounter;
      const caption = labelMatch ? captionFull.replace(/\s*\{#[\w:-]+\}$/, '') : captionFull;
      i++;

      const annotationLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '>' && !lines[i].match(/^>\s*\|/)) {
        const lineContent = lines[i].replace(/^>\s?/, '').trim();
        if (lineContent) annotationLines.push(lineContent);
        i++;
      }

      if (i < lines.length && lines[i].trim() === '>') {
        i++;
      }

      const tableLines: string[] = [];
      while (i < lines.length && lines[i].match(/^>\s*\|/)) {
        tableLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }

      if (footnotesMode) {
        // HTML format for footnotes export
        const tblPrefix = crossrefOptions?.tblPrefix || '表';
        processedLines.push(`<center>${tblPrefix}${tableCounter} ${caption}</center>`, '');
        processedLines.push(...tableLines);
        if (annotationLines.length > 0) {
          processedLines.push(`<center><font color="#595959">${annotationLines.join('\n')}</font></center>`);
        }
      } else {
        processedLines.push(': ' + caption + ' {#' + tblLabel + '}');
        processedLines.push('');
        processedLines.push(...tableLines);
        if (annotationLines.length > 0) {
          processedLines.push('');
          processedLines.push(...annotationLines);
        }
      }
    } else {
      processedLines.push(lines[i]);
      i++;
    }
  }
  result = processedLines.join('\n');

  // 1d. Convert equation labels to \tag format in footnotes mode
  if (footnotesMode) {
    const eqPrefix = crossrefOptions?.eqnPrefix || '式';
    let eqCounter = 0;
    // Match $$...$$ {#eq:xxx} pattern
    result = result.replace(/\$\$([\s\S]*?)\$\$\s*\{#(eq:[a-zA-Z0-9][a-zA-Z0-9-]*)\}/g,
      (_match: string, formula: string, _label: string) => {
        eqCounter++;
        return `$$${formula.trim()} \\tag{${eqPrefix} ${eqCounter}}$$`;
      }
    );
    // Also handle inline equations with labels: $...$ {#eq:xxx}
    result = result.replace(/\$([^\$\n]+?)\$\s*\{#(eq:[a-zA-Z0-9][a-zA-Z0-9-]*)\}/g,
      (_match: string, formula: string, _label: string) => {
        eqCounter++;
        return `$${formula.trim()}$\\tag{${eqPrefix} ${eqCounter}}`;
      }
    );
  }

  // 2. Convert regular wikilinks to plain text
  if (!skipWikilinkConversion) {
    result = result.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (match, page, display) => {
      return display || page;
    });
  }

  // 3. Convert Obsidian callouts to blockquotes
  result = result.replace(
    /^>\s*\[!(\w+)\]\s*(.*)$/gm,
    (_match, type, title) => {
      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      return '> **' + capitalizedType + '**: ' + title;
    }
  );

  // 4. Shift heading levels: user uses ## as h1, ### as h2 (skip in footnotes mode)
  if (!footnotesMode) {
    result = result.replace(/^(\s*)##/gm, '$1#');
  }

  return result;
}

/**
 * Export to Markdown with Obsidian footnotes + Zotero citations (author-year style).
 *
 * Flow:
 * 1. Extract all citation wikilinks from content
 * 2. Call Zotero API to get CSL JSON for each citekey
 * 3. Use Pandoc citeproc to format references in author-year style (e.g., APA)
 * 4. Replace wikilinks in text with "Author (Year)[^n]"
 * 5. Append "## 参考文献" + footnote definitions at end
 */
export async function exportToMarkdownFootnotes(
  content: string,
  citations: CitationInfo[],
  pandocPath: string,
  cslStyleFile?: string,
  crossrefFilterPath?: string,
  crossrefOptions?: {
    figPrefix?: string;
    tblPrefix?: string;
    eqnPrefix?: string;
    figureTitle?: string;
    tableTitle?: string;
    equationTitle?: string;
    chapDelim?: string;
    autoSectionLabels?: boolean;
    lang?: 'zh' | 'en';
  }
): Promise<string> {
  if (citations.length === 0) {
    // No citations, just clean up wikilinks and return
    return cleanMarkdown(content);
  }

  const tmpDir = os.tmpdir();
  const baseName = `zotero_export_${Date.now()}`;

  // Define all temp file paths upfront for cleanup
  const tmpMd = path.join(tmpDir, `${baseName}.md`);
  const tmpJson = path.join(tmpDir, `${baseName}_csl.json`);
  const tmpRefsMd = path.join(tmpDir, `${baseName}_refs.md`);
  const tmpBibMd = path.join(tmpDir, `${baseName}_bib.md`);
  const tmpFullMd = path.join(tmpDir, `${baseName}_full.md`);
  const tmpCiteMd = path.join(tmpDir, `${baseName}_cites.md`);
  const tmpBibMd2 = path.join(tmpDir, `${baseName}_bib2.md`);

  const allTempFiles = [tmpMd, tmpJson, tmpRefsMd, tmpBibMd, tmpFullMd, tmpCiteMd, tmpBibMd2];

  try {
    // Step 1: Prepare markdown with @citekey citations for pandoc
    const citekeys = citations.map(c => c.citekey);
    const uniqueCitekeys = [...new Set(citekeys)];

    // Build markdown with pandoc citations
    let md = content;
    // Remove existing frontmatter
    md = md.replace(/^---\n[\s\S]*?\n---\n/, '');

    // Replace wikilinks with @citekey (will be processed by pandoc citeproc)
    for (const cit of citations) {
      const escaped = cit.fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      md = md.replace(new RegExp(escaped, 'g'), `[@${cit.citekey}]`);
    }

    // Convert other wikilinks to plain text
    md = cleanMarkdown(md);

    // Add YAML metadata for citeproc
    let yaml = '---\n';
    yaml += 'nocite: |\n';
    for (const ck of uniqueCitekeys) {
      yaml += `  @${ck}\n`;
    }
    yaml += '---\n\n';
    md = yaml + md;

    fs.writeFileSync(tmpMd, md, 'utf-8');

    // Step 2: Fetch CSL JSON from Zotero API (no BBT required)
    // Use itemKey directly from citation (the 8-char KEY-XXXXXXXX)
    // Deduplicate by itemKey
    const uniqueItemKeys = [...new Set(citations.map(c => c.key))];
    const itemKeysParam = uniqueItemKeys.join(',');
    // Local API: users/0 works as "current user"
    const zoteroApiUrl = `http://127.0.0.1:23119/api/users/0/items?format=csljson&itemKey=${itemKeysParam}`;

    let cslItems: any[] = [];
    try {
      const curlCmd = `curl -s "${zoteroApiUrl}"`;
      const output = execSync(curlCmd, { encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
      const items = JSON.parse(output);
      if (Array.isArray(items)) {
        // Keep only main bibliographic items, exclude child items (PDF, notes, annotations)
        const childTypes = new Set(['document', 'note', 'attachment']);
        cslItems = items.filter((item: any) => !childTypes.has(item.type));
      }
    } catch (e) {
      console.error('Failed to fetch from Zotero API:', e);
      throw new Error('无法连接 Zotero，请确保 Zotero 正在运行（端口 23119）且已启用 "Allow other applications on this computer to communicate with Zotero"');
    }

    if (cslItems.length === 0) {
      throw new Error('未从 Zotero 获取到文献数据，请检查引用键是否正确');
    }

    fs.writeFileSync(tmpJson, JSON.stringify(cslItems, null, 2), 'utf-8');

    // Step 3: Determine CSL style to use
    // If cslStyleFile is a URL or path, use it; otherwise default to 'apa'
    let cslStyle = cslStyleFile || 'apa';

    // Step 4: Get formatted citations (author-year style)
    const citeMd = uniqueCitekeys.map(ck => `[@${ck}]`).join('; ');
    fs.writeFileSync(tmpCiteMd, citeMd, 'utf-8');

    // Use forward slashes for Windows compatibility with execSync
    const pandocArgs3 = [
      tmpCiteMd.replace(/\\/g, '/'),
      '--from', 'markdown+yaml_metadata_block',
      '--to', 'markdown',
      '--citeproc',
      '--bibliography', tmpJson.replace(/\\/g, '/'),
      '--csl', cslStyle,
    ];
    const cmd3 = `"${pandocPath}" ${pandocArgs3.map(a => `"${a}"`).join(' ')}`;
    console.log('Running pandoc citeproc (citations):', cmd3);
    const citeOutput = execSync(cmd3, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });

    // Extract just the body citations (before any bibliography div)
    const bodyText = citeOutput.split(/\n:+\s*\{#refs/)[0].trim();

    // Build citation map: run pandoc once per unique citekey for accurate author-year
    const citeMap: Record<string, string> = {};
    for (const ck of uniqueCitekeys) {
      const singleMd = `[@${ck}]`;
      const singleTmp = path.join(os.tmpdir(), `zotero_single_${ck}.md`).replace(/\\/g, '/');
      fs.writeFileSync(singleTmp, singleMd, 'utf-8');
      const singleArgs = [
        singleTmp,
        '--from', 'markdown+yaml_metadata_block',
        '--to', 'markdown',
        '--citeproc',
        '--bibliography', tmpJson.replace(/\\/g, '/'),
        '--csl', cslStyle,
      ];
      const singleCmd = `"${pandocPath}" ${singleArgs.map(a => `"${a}"`).join(' ')}`;
      try {
        const singleOut = execSync(singleCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        const singleBody = singleOut.split(/\n:+\s*\{#refs/)[0].trim();
        citeMap[ck] = singleBody || ck;
      } catch {
        citeMap[ck] = ck;
      } finally {
        try { fs.unlinkSync(singleTmp); } catch {}
      }
    }

    // Build bibliography from CSL JSON items directly
    const bibEntries: Record<string, string> = {};
    for (const item of cslItems) {
      const citekey = item.id || item['citation-key'] || '';
      if (!citekey) continue;
      const authors = (item.author || []).map((a: any) => {
        if (a.literal) return a.literal;
        const family = a.family || '';
        const given = a.given || '';
        const particle = a['non-dropping-particle'] || '';
        const fullFamily = particle ? `${particle} ${family}` : family;
        if (!given) return fullFamily;
        // Abbreviate given names: "Jade" -> "J.", "R. Kyle" -> "R. K."
        const abbreviated = given.split(/[\s.-]+/).filter(Boolean).map((n: string) => {
          if (n.endsWith('.')) return n;  // Already abbreviated (e.g., "R.")
          return n.charAt(0).toUpperCase() + '.';
        }).join(' ');
        return `${fullFamily}, ${abbreviated}`;
      }).join(', ');
      const year = item.issued?.['date-parts']?.[0]?.[0] || '';
      const title = item.title || '';
      const container = item['container-title'] || '';
      const volume = item.volume || '';
      const issue = item.issue || '';
      const page = item.page || '';
      const doi = item.DOI || '';
      const yearStr = `(${year}). `;
      let ref = `${authors}${authors.endsWith('.') ? '' : '.'} ${yearStr}${title}.`;
      if (container) ref += ` *${container}*`;
      if (volume) ref += `, *${volume}*`;
      if (issue) ref += `(${issue})`;
      if (page) ref += `, ${page}`;
      if (!container && !volume && !issue && !page) {
        // No container info — title already ends with period
      } else {
        ref += '.';
      }
      bibEntries[citekey] = ref;
    }

    // Step 6: Build final markdown
    let result = content;

    // Build footnote index map for deduplication: citekey -> footnoteIndex
    const footnoteIndexMap: Record<string, number> = {};
    let footnoteCounter = 0;

    // First pass: assign footnote index for each unique citekey
    for (const cit of citations) {
      if (!footnoteIndexMap[cit.citekey]) {
        footnoteCounter++;
        footnoteIndexMap[cit.citekey] = footnoteCounter;
      }
    }

    // Second pass: replace wikilinks with author-year + footnote ref
    for (const cit of citations) {
      const footnoteIndex = footnoteIndexMap[cit.citekey];
      const authorYear = citeMap[cit.citekey] || `${cit.alias}`;
      const escaped = cit.fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), `${authorYear}[^${footnoteIndex}]`);
    }

    // Clean other wikilinks
    // In footnotes mode, first replace @labels with numbers, then let cleanMarkdown handle {#labels}
    if (crossrefOptions?.lang === 'zh' || !crossrefOptions?.lang) {
      // Chinese mode: replace @labels before cleanMarkdown removes {#labels}
      const pref: Record<string, string> = {
        fig: crossrefOptions?.figPrefix || '图',
        tbl: crossrefOptions?.tblPrefix || '表',
        eq: crossrefOptions?.eqnPrefix || '式'
      };

      // Extract labels and assign numbers
      const counters = { fig: 0, tbl: 0, eq: 0 };
      const labelMap: Record<string, string> = {};
      const labelRegex = /\{#(fig|tbl|eq):([a-zA-Z0-9][a-zA-Z0-9-]*)\}/g;
      let labelMatch;
      while ((labelMatch = labelRegex.exec(result)) !== null) {
        counters[labelMatch[1] as keyof typeof counters]++;
        const key = `${labelMatch[1]}:${labelMatch[2]}`;
        labelMap[key] = String(counters[labelMatch[1] as keyof typeof counters]);
      }
      // Also extract labels from figure/table callouts
      const calloutLabelRegex = /^>\s*\[!(?:figure|table)\]\s*.*\{#(fig|tbl):([a-zA-Z0-9][a-zA-Z0-9-]*)\}/gm;
      while ((labelMatch = calloutLabelRegex.exec(result)) !== null) {
        counters[labelMatch[1] as keyof typeof counters]++;
        const key = `${labelMatch[1]}:${labelMatch[2]}`;
        if (!labelMap[key]) {
          labelMap[key] = String(counters[labelMatch[1] as keyof typeof counters]);
        }
      }

      // Replace @labels with numbers BEFORE cleanMarkdown
      result = result.replace(/@(fig|tbl|eq):([a-zA-Z0-9][\w-]*)\s+([a-z])\b/g, (_m, type, label, suffix) => {
        const key = `${type}:${label}`;
        const num = labelMap[key];
        if (num) {
          if (type === 'tbl') {
            return `${pref[type]}${num}${suffix}`;
          }
          return `${pref[type]} ${num}${suffix}`;
        }
        return _m;
      });
      result = result.replace(/@(fig|tbl|eq):([a-zA-Z0-9][\w-]*)\b/g, (_m, type, label) => {
        const key = `${type}:${label}`;
        const num = labelMap[key];
        if (num) {
          if (type === 'tbl') {
            return `${pref[type]}${num}`;
          }
          return `${pref[type]} ${num}`;
        }
        return _m;
      });
    }

    result = cleanMarkdown(result, crossrefOptions);

    // Extract figure/table captions from alt text to visible lines
    // Figures: caption after image; Tables: caption before table
    result = result.replace(/!\[([^\]]*?)\]\(([^)]+)\)\{#(fig|tbl):([\w-]+)\}/g,
      (_m, caption, url, type, label) => {
        const line = `**${caption}**`;
        if (type === 'fig') return `![${caption}](${url}){#${type}:${label}}\n\n${line}`;
        return `${line}\n\n![${caption}](${url}){#${type}:${label}}`;
      }
    );

    // Remove existing frontmatter
    result = result.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

    // Add footnotes section
    result += '\n\n## 参考文献\n\n';
    // Output footnotes in order of first appearance
    const sortedCitekeys = Object.entries(footnoteIndexMap)
      .sort((a, b) => a[1] - b[1])
      .map(([ck]) => ck);

    for (const ck of sortedCitekeys) {
      const idx = footnoteIndexMap[ck];
      const fullRef = bibEntries[ck] || ck;
      result += `[^${idx}]: ${fullRef}\n\n`;
    }

    // For English mode, resolve cross-references after cleanMarkdown
    if (crossrefOptions?.lang === 'en') {
      result = resolveCrossrefs(result, crossrefOptions);
    }

    return result.trim() + '\n';

  } finally {
    // Cleanup temp files
    for (const f of allTempFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

/**
 * Clean up markdown: convert wikilinks to plain text, handle images, etc.
 */
function cleanMarkdown(content: string, crossrefOptions?: { figPrefix?: string; tblPrefix?: string; eqnPrefix?: string }): string {
  return applyMarkdownTransformations(content, false, true, crossrefOptions).trim() + '\n';
}