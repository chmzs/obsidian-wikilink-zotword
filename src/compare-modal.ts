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

    const settingRow = this.contentEl.createDiv({
      attr: { style: "display:flex;gap:8px;align-items:center;margin:8px 0;" },
    });
    this.inputEl = settingRow.createEl("input", {
      type: "text",
      attr: { style: "flex:1;padding:4px 8px;" },
    });
    this.inputEl.value = this.lastPath;
    this.inputEl.placeholder = "旧版 .docx 完整路径";

    this.statusEl = settingRow.createEl("span", {
      attr: { style: "font-size:0.85em;white-space:nowrap;" },
    });
    this.updateStatus();

    this.inputEl.addEventListener("input", () => this.updateStatus());

    const btnRow = this.contentEl.createDiv({
      attr: { style: "display:flex;gap:8px;margin-top:12px;" },
    });

    const pickBtn = btnRow.createEl("button", { text: "选择文件…" });
    pickBtn.addEventListener("click", async () => {
      const picked = await pickDocxFile(this.lastPath || undefined);
      if (picked) {
        this.inputEl.value = picked;
        this.updateStatus();
      }
    });

    btnRow.createEl("span", { attr: { style: "flex:1;" } });

    const cancelBtn = btnRow.createEl("button", { text: "取消" });
    cancelBtn.addEventListener("click", () => this.close());

    const confirmBtn = btnRow.createEl("button", {
      text: "开始导出",
      cls: "mod-cta",
    });
    confirmBtn.addEventListener("click", () => this.confirm());
  }

  private updateStatus() {
    const value = this.inputEl.value.trim();
    if (!value) {
      this.statusEl.setText("未选择");
      this.statusEl.style.color = "var(--text-muted)";
    } else if (fs.existsSync(value)) {
      this.statusEl.setText("✓ 文件存在");
      this.statusEl.style.color = "var(--text-success)";
    } else {
      this.statusEl.setText("✗ 文件不存在");
      this.statusEl.style.color = "var(--text-error)";
    }
  }

  private confirm() {
    const value = this.inputEl.value.trim();
    if (!value) {
      new Notice("请先指定旧版 Word 文档");
      return;
    }
    if (!fs.existsSync(value)) {
      new Notice(`文件不存在:\n${value}`);
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
