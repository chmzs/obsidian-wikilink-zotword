import { Notice, Plugin, TFile } from "obsidian";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  ZoteroExportSettings,
  DEFAULT_SETTINGS,
  ZoteroExportSettingTab,
  type CrossrefOptions,
} from "./settings";

import {
  extractCitations,
  preprocessMarkdown,
  buildPandocArgs,
  exportToMarkdownFootnotes,
  resolveCrossrefs,
} from "./preprocessor";

/**
 * Parse YAML frontmatter for crossref_lang: zh/en to switch presets.
 */
function parseCrossrefOverrides(content: string, settings: ZoteroExportSettings): Partial<CrossrefOptions> {
  const overrides: Partial<CrossrefOptions> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return overrides;

  if (/^crossref_lang:\s*en$/m.test(match[1])) {
    const en = settings.crossrefEn;
    if (en) {
      for (const key of ['figPrefix', 'tblPrefix', 'eqnPrefix', 'figureTitle', 'tableTitle', 'equationTitle', 'chapDelim'] as const) {
        (overrides as any)[key] = (en as any)[key];
      }
    }
  }
  return overrides;
}

export default class ZoteroExportPlugin extends Plugin {
  settings: ZoteroExportSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "export-to-word",
      name: "Export to Word (Zotero Citations)",
      callback: () => this.exportCurrentNote(),
    });

    this.addCommand({
      id: "export-to-markdown-footnotes",
      name: "Export to Markdown (Obsidian Footnotes + Zotero)",
      callback: () => this.exportToMarkdownFootnotes(),
    });

    this.addSettingTab(new ZoteroExportSettingTab(this.app, this));
    console.log("Zotero Citation Export plugin loaded");
  }

  onunload() {
    console.log("Zotero Citation Export plugin unloaded");
  }

  async loadSettings() {
    const saved = await this.loadData() || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    // Deep merge: use default values for any empty/missing crossref fields
    for (const key of ['crossref', 'crossrefEn'] as const) {
      const savedSub = saved[key];
      if (savedSub) {
        for (const k of Object.keys(DEFAULT_SETTINGS[key])) {
          const v = savedSub[k];
          if (v === undefined || v === null || v === '') {
            this.settings[key][k] = DEFAULT_SETTINGS[key][k];
          }
        }
      }
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async exportCurrentNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("❌ 没有打开的笔记文件");
      return;
    }

    // Pre-flight checks
    const pandocOk = this.checkPandoc();
    if (!pandocOk) return;

    const filterPath = this.findLuaFilter();
    if (!filterPath) {
      new Notice("❌ 找不到 Lua 过滤器\n请确认插件 filters/ 目录完整");
      return;
    }

    try {
      new Notice("⏳ 正在导出...");

      // 1. Read and extract citations
      const content = await this.app.vault.read(file);
      const citations = extractCitations(content);
      console.log(`Found ${citations.length} citations`);

      citations.forEach(c => console.log(`  ${c.fullMatch} → @${c.citekey}`));

      // 2. Preprocess markdown
      const preprocessed = preprocessMarkdown(content, this.settings.exportMode);

      // 2b. Parse YAML frontmatter for per-document crossref overrides
      const yamlOverrides = parseCrossrefOverrides(content, this.settings);
      const crossrefOptions = { ...this.settings.crossref, ...yamlOverrides };

      // 4. Resolve cross-references (before pandoc, since crossref filter may not be used)
      const resolved = resolveCrossrefs(preprocessed, crossrefOptions);

      // 5. Write temp files
      const tmpDir = os.tmpdir();
      const baseName = path.basename(file.path, ".md");
      const tmpMd = path.join(tmpDir, `${baseName}_zotero_export.md`).replace(/\\/g, '/');
      const tmpDocx = path.join(tmpDir, `${baseName}_export.docx`).replace(/\\/g, '/');

      fs.writeFileSync(tmpMd, resolved, "utf-8");

      // 5. Run Pandoc
      const crossrefFilterPath = this.settings.crossref.crossrefFilterPath || undefined;

      const pandocArgs = buildPandocArgs(
        tmpMd,
        tmpDocx,
        filterPath,
                this.settings.templatePath,
        crossrefOptions,
        crossrefFilterPath
      );
      const cmd = `"${this.settings.pandocPath}" ${pandocArgs.map(a => `"${a}"`).join(" ")}`;
      console.log("Running:", cmd);

      try {
        execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
      } catch (error) {
        const stderr = error.stderr?.toString() || error.message;
        console.error("Pandoc failed:", stderr);
        new Notice(`❌ Pandoc 转换失败\n\n${this.summarizePandocError(stderr)}`);
        this.cleanup(tmpMd, tmpDocx);
        return;
      }

      // 6. Copy to output
      const vaultBase = (this.app.vault.adapter as any).basePath;
      const parentPath = file.parent?.path;
      const outputDir = this.settings.outputDir
        || (parentPath ? path.join(vaultBase, parentPath) : vaultBase);
      const outputPath = path.join(outputDir, `${baseName}.docx`).replace(/\\/g, '/');

      try {
        fs.copyFileSync(tmpDocx, outputPath);
      } catch (error: any) {
        console.error("Copy failed:", error.message);
        if (error.code === "EPERM" || error.code === "EBUSY") {
          new Notice(`❌ 无法写入文件，同名 Word 被占用，请关闭后重试\n${outputPath}`);
        } else if (error.code === "ENOENT") {
          new Notice(`❌ 输出目录不存在\n${outputDir}`);
        } else {
          new Notice(`❌ 写入文件失败: ${error.message}\n${outputPath}`);
        }
        this.cleanup(tmpMd, tmpDocx);
        return;
      }

      // 7. Cleanup
      this.cleanup(tmpMd, tmpDocx);

      const msg = citations.length > 0
        ? `✅ 导出成功（${citations.length} 条引用）\n${outputPath}`
        : `✅ 导出成功（无引用）\n${outputPath}`;
      new Notice(msg);

      // Warn if some citekeys weren't found by BBT
      if (citations.length > 0) {
        this.checkBbtConnection();
      }

    } catch (error) {
      console.error("Export failed:", error);
      new Notice(`❌ 导出失败: ${error.message}`);
    }
  }

  async exportToMarkdownFootnotes() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("❌ 没有打开的笔记文件");
      return;
    }

    // Pre-flight checks
    const pandocOk = this.checkPandoc();
    if (!pandocOk) return;

    try {
      new Notice("⏳ 正在导出 Markdown 脚注格式...");

      // 1. Read and extract citations
      const content = await this.app.vault.read(file);
      const citations = extractCitations(content);
      console.log(`Found ${citations.length} citations`);

      citations.forEach(c => console.log(`  ${c.fullMatch} → @${c.citekey}`));

      if (citations.length > 0) {
        new Notice("📡 正在连接 Zotero 获取文献元数据...");
      }

      // 2. Run markdown footnotes conversion
      const crossrefFilterPath = this.settings.crossref.crossrefFilterPath || undefined;
      const yamlOverrides2 = parseCrossrefOverrides(content, this.settings);
      const crossrefOptions2 = { ...this.settings.crossref, ...yamlOverrides2 };
      const result = await exportToMarkdownFootnotes(
        content, citations, this.settings.pandocPath, this.settings.cslStyleFile,
        crossrefFilterPath, crossrefOptions2
      );

      if (citations.length > 0) {
        new Notice("📝 正在格式化引文与参考文献...");
      }

      // 3. Write output file (same directory as source note)
      const parentPath = file.parent?.path || "";
      const baseName = path.basename(file.path, ".md");
      const outputPath = path.join(parentPath, `${baseName}_footnotes.md`).replace(/\\/g, '/');

      try {
        await this.app.vault.adapter.write(outputPath, result);
      } catch (error: any) {
        console.error("Write failed:", error.message);
        new Notice(`❌ 写入文件失败: ${error.message}\n${outputPath}`);
        return;
      }

      const msg = citations.length > 0
        ? `✅ 导出成功（${citations.length} 条引用）\n${outputPath}`
        : `✅ 导出成功（无引用）\n${outputPath}`;
      new Notice(msg);

      // 4. Open in Obsidian
      const outputFile = this.app.vault.getAbstractFileByPath(outputPath);
      if (outputFile instanceof TFile) {
        await this.app.workspace.getLeaf('tab').openFile(outputFile);
      }

    } catch (error) {
      console.error("Export failed:", error);
      new Notice(`❌ 导出失败: ${error.message}`);
    }
  }

  /**
   * Pre-flight check: verify Pandoc is accessible.
   */
  private checkPandoc(): boolean {
    try {
      execSync(`"${this.settings.pandocPath}" --version`, {
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      return true;
    } catch {
      new Notice(
        `❌ 找不到 Pandoc\n\n` +
        `当前路径: ${this.settings.pandocPath}\n\n` +
        `请确认:\n` +
        `1. 已安装 Pandoc (≥2.16.2)\n` +
        `2. 已加入系统 PATH，或在设置中填写完整路径`
      );
      return false;
    }
  }

  /**
   * Warn if BBT/Zotero is not reachable (non-blocking).
   */
  private checkBbtConnection() {
    try {
      execSync("curl -s --connect-timeout 3 http://127.0.0.1:23119/connector/ping", {
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      new Notice(
        "⚠️ Zotero 未运行或 BBT 不可达\n\n" +
        "导出已完成，但引用可能无法在 Word 中刷新。\n" +
        "请启动 Zotero 后在 Word 中点击 Zotero → Refresh。"
      );
    }
  }

  /**
   * Summarize Pandoc error output for user-friendly display.
   */
  private summarizePandocError(stderr: string): string {
    if (stderr.includes("Could not fetch")) {
      return "zotero.lua 无法连接 BBT\n请确认 Zotero 正在运行且 BBT 已安装";
    }
    if (stderr.includes("not found")) {
      const match = stderr.match(/@(\S+) not found/);
      if (match) return `引用 @${match[1]} 在 Zotero 中不存在\n请检查 citation key 是否正确`;
    }
    if (stderr.includes("bad argument")) {
      return "Lua 兼容性错误，请更新插件";
    }
    // Truncate long errors
    const lines = stderr.split("\n").filter(l => l.trim());
    return lines.slice(-3).join("\n");
  }

  private cleanup(...files: string[]) {
    for (const f of files) {
      try { fs.unlinkSync(f); } catch {}
    }
  }

  /**
   * Find the appropriate Lua filter based on export mode.
   */
  private findLuaFilter(): string | undefined {
    const pluginDir = (this.app.vault.adapter as any).basePath;
    const isBbt = this.settings.exportMode === 'bbt';
    const filterName = isBbt ? 'zotero-bbt.lua' : 'zotero-lite.lua';

    // Primary: plugin's filters/ directory
    const primary = path.join(pluginDir, ".obsidian", "plugins", "wikilink-zotword", "filters", filterName);
    if (fs.existsSync(primary)) return primary;

    // Fallback: vault root
    const fallback = path.join(pluginDir, "filters", filterName);
    if (fs.existsSync(fallback)) return fallback;

    return undefined;
  }
}
