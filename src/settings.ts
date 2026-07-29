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

    containerEl.createEl("h4", { text: "中文预设" });
    this.addCrossrefSettings(containerEl, this.plugin.settings.crossref);

    containerEl.createEl("h4", { text: "English preset" });
    this.addCrossrefSettings(containerEl, this.plugin.settings.crossrefEn);

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

  private addCrossrefSettings(container: HTMLElement, target: CrossrefOptions) {
    new Setting(container)
      .setName("Figure prefix")
      .setDesc("图前缀（如 '图'、'Fig.'），控制正文引用前缀")
      .addText((text) =>
        text
          .setPlaceholder("图")
          .setValue(target.figPrefix)
          .onChange(async (value) => {
            target.figPrefix = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(container)
      .setName("Table prefix")
      .setDesc("表前缀（如 '表'、'Tab.'）")
      .addText((text) =>
        text
          .setPlaceholder("表")
          .setValue(target.tblPrefix)
          .onChange(async (value) => {
            target.tblPrefix = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(container)
      .setName("Equation prefix")
      .setDesc("公式前缀（如 '式'、'Eq.'）")
      .addText((text) =>
        text
          .setPlaceholder("式")
          .setValue(target.eqnPrefix)
          .onChange(async (value) => {
            target.eqnPrefix = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(container)
      .setName("Figure title")
      .setDesc("图题注标题文字（如 '图'、'Figure'）")
      .addText((text) =>
        text
          .setPlaceholder("图")
          .setValue(target.figureTitle)
          .onChange(async (value) => {
            target.figureTitle = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(container)
      .setName("Table title")
      .setDesc("表题注标题文字（如 '表'、'Table'）")
      .addText((text) =>
        text
          .setPlaceholder("表")
          .setValue(target.tableTitle)
          .onChange(async (value) => {
            target.tableTitle = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(container)
      .setName("Equation title")
      .setDesc("公式题注标题文字（如 '式'、'Equation'）")
      .addText((text) =>
        text
          .setPlaceholder("式")
          .setValue(target.equationTitle)
          .onChange(async (value) => {
            target.equationTitle = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(container)
      .setName("Chapter delimiter")
      .setDesc("章节分隔符（如 '.'、'-'）")
      .addText((text) =>
        text
          .setPlaceholder(".")
          .setValue(target.chapDelim)
          .onChange(async (value) => {
            target.chapDelim = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(container)
      .setName("Auto section labels")
      .setDesc("自动为章节生成标签（用于交叉引用）")
      .addToggle((toggle) =>
        toggle
          .setValue(target.autoSectionLabels)
          .onChange(async (value) => {
            target.autoSectionLabels = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
