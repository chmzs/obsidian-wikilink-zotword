import { App, PluginSettingTab, Setting } from "obsidian";
import type ZoteroExportPlugin from "./main";

export type ExportMode = "bbt" | "lite";

export interface ZoteroExportSettings {
  pandocPath: string;
  cslStyle: string;
  outputDir: string;
  templatePath: string;
  exportMode: ExportMode;
}

export const DEFAULT_SETTINGS: ZoteroExportSettings = {
  pandocPath: "pandoc",
  cslStyle: "china-national-standard-gb-t-7714-2015-numeric",
  outputDir: "",
  templatePath: "",
  exportMode: "bbt",
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
            this.display(); // Refresh to show/hide mode-specific settings
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
  }
}
