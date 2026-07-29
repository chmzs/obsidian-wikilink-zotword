import { App, PluginSettingTab, Setting } from "obsidian";
import type ZoteroExportPlugin from "./main";

export type ExportMode = "bbt" | "lite";

export interface CrossrefOptions {
  figPrefix: string;
  tblPrefix: string;
  eqnPrefix: string;
  figureTitle: string;
  tableTitle: string;
  equationTitle: string;
  chapDelim: string;
  autoSectionLabels: boolean;
  crossrefFilterPath: string;
}

export interface ZoteroExportSettings {
  pandocPath: string;
  outputDir: string;
  templatePath: string;
  exportMode: ExportMode;
  crossref: CrossrefOptions;       // 中文版
  crossrefEn: CrossrefOptions;     // 英文版
  cslStyleFile: string;
}

export const DEFAULT_SETTINGS: ZoteroExportSettings = {
  pandocPath: "pandoc",
  outputDir: "",
  templatePath: "",
  exportMode: "bbt",
  crossref: {
    figPrefix: "图",
    tblPrefix: "表",
    eqnPrefix: "式",
    figureTitle: "图",
    tableTitle: "表",
    equationTitle: "式",
    chapDelim: ".",
    autoSectionLabels: true,
    crossrefFilterPath: "",
  },
  crossrefEn: {
    figPrefix: "Fig.",
    tblPrefix: "Tab.",
    eqnPrefix: "Eq.",
    figureTitle: "Figure",
    tableTitle: "Table",
    equationTitle: "Equation",
    chapDelim: ".",
    autoSectionLabels: true,
    crossrefFilterPath: "",
  },
  cslStyleFile: "apa",
};

export class ZoteroExportSettingTab extends PluginSettingTab {
  plugin: ZoteroExportPlugin;

  constructor(app: App, plugin: ZoteroExportPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Wikilink to Zotero Word" });

    containerEl.createEl("p", {
      text: "将 Obsidian [[wikilink]] 文献引用导出为 Word 中的 Zotero 活引文。",
    });

    // --- Export ---
    containerEl.createEl("h3", { text: "导出设置" });

    new Setting(containerEl)
      .setName("Export mode")
      .setDesc("BBT: 依赖 Better BibTeX，活引文 + citekey 映射。Lite: 仅需 Zotero，直接用 8 位 itemKey。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("bbt", "BBT (完整版)")
          .addOption("lite", "Lite (无 BBT)")
          .setValue(this.plugin.settings.exportMode)
          .onChange(async (value: string) => {
            this.plugin.settings.exportMode = value as ExportMode;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // CSL style file for markdown-footnotes mode
    new Setting(containerEl)
      .setName("CSL style file (Markdown Footnotes)")
      .setDesc("CSL 样式文件路径（如 apa.csl、chicago-author-date.csl 或完整 URL）。用于 Markdown 脚注导出模式。")
      .addText((text) =>
        text
          .setPlaceholder("apa.csl 或完整路径/URL")
          .setValue(this.plugin.settings.cslStyleFile)
          .onChange(async (value) => {
            this.plugin.settings.cslStyleFile = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Output directory")
      .setDesc("导出目录（留空则与笔记同目录）")
      .addText((text) =>
        text
          .setPlaceholder("(同笔记目录)")
          .setValue(this.plugin.settings.outputDir)
          .onChange(async (value) => {
            this.plugin.settings.outputDir = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Word template")
      .setDesc("自定义 .docx 模板路径（留空使用默认模板）。模板中可预设页眉页脚、样式等。")
      .addText((text) =>
        text
          .setPlaceholder("(默认模板)")
          .setValue(this.plugin.settings.templatePath)
          .onChange(async (value) => {
            this.plugin.settings.templatePath = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Advanced ---
    containerEl.createEl("h3", { text: "高级设置" });

    new Setting(containerEl)
      .setName("Pandoc path")
      .setDesc("Pandoc 可执行文件路径（已在 PATH 中则填 pandoc）")
      .addText((text) =>
        text
          .setPlaceholder("pandoc")
          .setValue(this.plugin.settings.pandocPath)
          .onChange(async (value) => {
            this.plugin.settings.pandocPath = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Crossref Options ---
    containerEl.createEl("h3", { text: "图表交叉引用 (pandoc-crossref)" });

    new Setting(containerEl)
      .setName("pandoc-crossref path")
      .setDesc("pandoc-crossref 可执行文件路径，需自行下载安装。如 D:/tools/pandoc-crossref.exe")
      .addText((text) =>
        text
          .setPlaceholder("(空=不使用)")
          .setValue(this.plugin.settings.crossref.crossrefFilterPath)
          .onChange(async (value) => {
            this.plugin.settings.crossref.crossrefFilterPath = value;
            await this.plugin.saveSettings();
          })
      );

    const xrefContainer = containerEl.createDiv({ cls: "crossref-settings" });
    const grid = xrefContainer.createDiv({ attr: { style: "display:grid;grid-template-columns:1fr 1fr;gap:0 24px;" } });

    // Column 1: Chinese
    const zhCol = grid.createDiv();
    zhCol.createEl("h5", { text: "中文" });
    this.crossrefFields(zhCol, this.plugin.settings.crossref, false);

    // Column 2: English
    const enCol = grid.createDiv();
    enCol.createEl("h5", { text: "English" });
    this.crossrefFields(enCol, this.plugin.settings.crossrefEn, true);

    new Setting(containerEl)
      .setName("pandoc-crossref path")
      .setDesc("pandoc-crossref 可执行文件路径，需自行下载安装。如 D:/tools/pandoc-crossref.exe")
      .addText((text) =>
        text
          .setPlaceholder("(空=不使用)")
          .setValue(this.plugin.settings.crossref.crossrefFilterPath)
          .onChange(async (value) => {
            this.plugin.settings.crossref.crossrefFilterPath = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private crossrefFields(container: HTMLElement, target: CrossrefOptions, isEnglish: boolean) {
    const f = isEnglish ? 'Fig.' : '图';
    const t = isEnglish ? 'Tab.' : '表';
    const e = isEnglish ? 'Eq.' : '式';
    const fTitle = isEnglish ? 'Figure' : '图';
    const tTitle = isEnglish ? 'Table' : '表';
    const eTitle = isEnglish ? 'Equation' : '式';
    const fields: [string, keyof CrossrefOptions, string][] = [
      ['Figure prefix', 'figPrefix', f],
      ['Table prefix', 'tblPrefix', t],
      ['Equation prefix', 'eqnPrefix', e],
      ['Figure title', 'figureTitle', fTitle],
      ['Table title', 'tableTitle', tTitle],
      ['Equation title', 'equationTitle', eTitle],
      ['Chapter delimiter', 'chapDelim', '.'],
      ['Auto section labels', 'autoSectionLabels', ''],
    ];
    for (const [label, key, ph] of fields) {
      if (key === 'autoSectionLabels') {
        new Setting(container)
          .setName(label)
          .addToggle((toggle) =>
            toggle
              .setValue(Boolean(target[key]))
              .onChange(async (val) => {
                target[key] = val as any;
                await this.plugin.saveSettings();
              })
          );
      } else {
        new Setting(container)
          .setName(label)
          .addText((text) =>
            text
              .setPlaceholder(ph)
              .setValue(String(target[key] || ''))
              .onChange(async (val) => {
                target[key] = val as any;
                await this.plugin.saveSettings();
              })
          );
      }
    }
  }
}
