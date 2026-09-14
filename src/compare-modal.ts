import { App, Modal, Notice } from "obsidian";
import * as fs from "fs";
import { pickDocxFile } from "./revision";

/**
 * Modal for the "Export revision comparison" command.
 *
 * Shows the previously used comparison docx (pre-filled in a text box),
 * so the user can confirm directly, pick a new file with the native
 * dialog, or paste a different path.
 *
 * onChoose receives the confirmed path, or null on cancel.
 */
export class CompareDocModal extends Modal {
  private submitted = false;
  private inputEl!: HTMLInputElement;
  private statusEl!: HTMLElement;

  constructor(
    app: App,
    private lastPath: string,
    private newDocName: string,
    private onChoose: (path: string | null) => void
  ) {
    super(app);
  }

  onOpen() {
    this.titleEl.setText("导出为修订对比版");

    this.contentEl.createEl("p", {
      text: `新版将从当前笔记导出：${this.newDocName}。请指定要与之比较的旧版 Word 文档。`,
    });

    this.contentEl.addClass("wikilink-zotword-compare-modal");
    const settingRow = this.contentEl.createDiv({ cls: "wikilink-zotword-compare-row" });
    this.inputEl = settingRow.createEl("input", { type: "text" });
    this.inputEl.value = this.lastPath;
    this.inputEl.placeholder = "旧版 .docx 完整路径";

    this.statusEl = settingRow.createEl("span", { cls: "wikilink-zotword-compare-status" });
    this.updateStatus();

    this.inputEl.addEventListener("input", () => this.updateStatus());

    const btnRow = this.contentEl.createDiv({ cls: "wikilink-zotword-compare-actions" });

    const pickBtn = btnRow.createEl("button", { text: "选择文件…" });
    pickBtn.addEventListener("click", async () => {
      const picked = await pickDocxFile(this.lastPath || undefined);
      if (picked) {
        this.inputEl.value = picked;
        this.updateStatus();
      }
    });

    btnRow.createEl("span", { cls: "wikilink-zotword-compare-spacer" });

    const cancelBtn = btnRow.createEl("button", { text: "取消" });
    cancelBtn.addEventListener("click", () => this.close());

    const confirmBtn = btnRow.createEl("button", {
      text: "开始导出",
      cls: "mod-cta",
    });
    confirmBtn.addEventListener("click", () => this.confirm());
  }

  private validatePath(value: string): string | null {
    if (!value) return "未选择";
    try {
      const stat = fs.statSync(value);
      if (!stat.isFile()) return "✗ 不是文件";
      if (!/\.docx$/i.test(value)) return "✗ 请选择 .docx 文件";
      return "✓ 文件存在";
    } catch {
      return "✗ 文件不存在或不可读";
    }
  }

  private updateStatus() {
    const value = this.inputEl.value.trim();
    const message = this.validatePath(value) ?? "✗ 文件无效";
    this.statusEl.setText(message);
    this.statusEl.style.color = message.startsWith("✓")
      ? "var(--text-success)"
      : value ? "var(--text-error)" : "var(--text-muted)";
  }

  private confirm() {
    const value = this.inputEl.value.trim();
    if (!value) {
      new Notice("请先指定旧版 Word 文档");
      return;
    }
    const validation = this.validatePath(value);
    if (validation !== "✓ 文件存在") {
      new Notice(`${validation}\n${value}`);
      return;
    }
    this.submitted = true;
    this.onChoose(value);
    this.close();
  }

  onClose() {
    if (!this.submitted) this.onChoose(null);
  }
}
