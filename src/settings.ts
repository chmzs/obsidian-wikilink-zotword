import { App, PluginSettingTab, Setting } from "obsidian";
import type ZoteroExportPlugin from "./main";

export type ExportMode = "bbt" | "lite";

export interface CrossrefOptions {
  figPrefix: string;
  tblPrefix: string;
  eqnPrefix: string;
  chapDelim: string;
  autoSectionLabels: boolean;
  crossrefFilterPath: string;
}

export interface ZoteroExportSettings {
  pandocPath: string;
  cslStyle: string;
  outputDir: string;
  templatePath: string;
  exportMode: ExportMode;
  crossref: CrossrefOptions;
  // Markdown footnotes mode
  cslStyleFile: string;
}

export const DEFAULT_SETTINGS: ZoteroExportSettings = {
  pandocPath: "pandoc",
  cslStyle: "china-national-standard-gb-t-7714-2015-numeric",
  outputDir: "",
  templatePath: "",
  exportMode: "bbt",
  crossref: {
    figPrefix: "图",
    tblPrefix: "表",
    eqnPrefix: "式",
    chapDelim: ".",
    autoSectionLabels: true,
    crossrefFilterPath: "",
  },
  // Markdown footnotes mode
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

    if (this.plugin.settings.exportMode === "bbt") {
      new Setting(containerEl)
        .setName("CSL style")
        .setDesc("引用样式 ID（如 china-national-standard-gb-t-7714-2015-numeric）")
        .addText((text) =>
          text
            .setPlaceholder("china-national-standard-gb-t-7714-2015-numeric")
            .setValue(this.plugin.settings.cslStyle)
            .onChange(async (value) => {
              this.plugin.settings.cslStyle = value;
              await this.plugin.saveSettings();
            })
        );
    }

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
      .setName("Figure prefix")
      .setDesc("图前缀（如 '图'、'Fig.'）")
      .addText((text) =>
        text
          .setPlaceholder("图")
          .setValue(this.plugin.settings.crossref.figPrefix)
          .onChange(async (value) => {
            this.plugin.settings.crossref.figPrefix = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Table prefix")
      .setDesc("表前缀（如 '表'、'Tab.'）")
      .addText((text) =>
        text
          .setPlaceholder("表")
          .setValue(this.plugin.settings.crossref.tblPrefix)
          .onChange(async (value) => {
            this.plugin.settings.crossref.tblPrefix = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Equation prefix")
      .setDesc("公式前缀（如 '式'、'Eq.'）")
      .addText((text) =>
        text
          .setPlaceholder("式")
          .setValue(this.plugin.settings.crossref.eqnPrefix)
          .onChange(async (value) => {
            this.plugin.settings.crossref.eqnPrefix = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Chapter delimiter")
      .setDesc("章节分隔符（如 '.'、'-'）")
      .addText((text) =>
        text
          .setPlaceholder(".")
          .setValue(this.plugin.settings.crossref.chapDelim)
          .onChange(async (value) => {
            this.plugin.settings.crossref.chapDelim = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto section labels")
      .setDesc("自动为章节生成标签（用于交叉引用）")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.crossref.autoSectionLabels)
          .onChange(async (value) => {
            this.plugin.settings.crossref.autoSectionLabels = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("pandoc-crossref path")
      .setDesc("pandoc-crossref 可执行文件路径（Quarto 用户留空自动检测；独立安装请填完整路径，如 D:/tools/pandoc-crossref.exe）")
      .addText((text) =>
        text
          .setPlaceholder("(留空自动检测 Quarto 内置)")
          .setValue(this.plugin.settings.crossref.crossrefFilterPath)
          .onChange(async (value) => {
            this.plugin.settings.crossref.crossrefFilterPath = value;
            await this.plugin.saveSettings();
          })
      );
  }
}