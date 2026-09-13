import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const execFileAsync = promisify(execFile);

/**
 * PowerShell script: call Word COM CompareDocuments to produce a docx
 * with native track changes. Runs Word invisibly; always quits Word
 * in finally to avoid orphan WINWORD processes.
 *
 * Note: through the PIA the first two CompareDocuments parameters are
 * Document objects (not file path strings), so both files must be
 * opened first (read-only). FileFormat 16 = wdFormatDocumentDefault (.docx)
 */
const COMPARE_SCRIPT = `param([string]$OldPath, [string]$NewPath, [string]$OutPath)
$ErrorActionPreference = 'Stop'
$word = $null
$docs = @()
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $docOld = $word.Documents.Open($OldPath, $false, $true)
  $docs += $docOld
  $docNew = $word.Documents.Open($NewPath, $false, $true)
  $docs += $docNew
  $result = $word.CompareDocuments($docOld, $docNew)
  if (-not $result) { throw 'CompareDocuments returned no document' }
  $docs += $result
  $result.SaveAs2($OutPath, 16)
} finally {
  foreach ($d in $docs) {
    try { if (-not $d.Saved) { $d.Saved = $true }; $d.Close($false) } catch {}
  }
  if ($word) { $word.Quit() }
}
`;

/**
 * Compare two .docx files with Microsoft Word (COM automation) and save a
 * third document containing native track changes.
 *
 * @param oldPath    original (reviewed/baseline) docx
 * @param newPath    freshly exported docx from this plugin
 * @param outputPath where the comparison document is saved
 */
export async function compareDocxWithWord(
  oldPath: string,
  newPath: string,
  outputPath: string,
  timeoutMs = 180000
): Promise<void> {
  if (path.resolve(oldPath) === path.resolve(newPath)) {
    throw new Error("旧版与新版是同一个文件，无法比较");
  }
  for (const p of [oldPath, newPath]) {
    if (!fs.existsSync(p)) throw new Error(`文件不存在: ${p}`);
  }
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) throw new Error(`输出目录不存在: ${outDir}`);

  const scriptPath = path.join(os.tmpdir(), "wikilink-zotword-compare.ps1");
  fs.writeFileSync(scriptPath, COMPARE_SCRIPT, "utf8");

  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      oldPath,
      newPath,
      outputPath,
    ],
    { timeout: timeoutMs, windowsHide: true }
  );
}

/**
 * Get Electron's remote module in the Obsidian desktop app, if available.
 * Newer Electron builds may not expose it — callers must handle null.
 */
function getElectronRemote(): any | null {
  try {
    if (typeof window !== "undefined" && (window as any).require) {
      const electron = (window as any).require("electron");
      return electron?.remote ?? null;
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Open a native file picker for choosing a .docx file.
 * Returns null when the picker is unavailable or the user cancels.
 */
export async function pickDocxFile(defaultPath?: string): Promise<string | null> {
  const remote = getElectronRemote();
  if (remote?.dialog?.showOpenDialog) {
    try {
      const res = await remote.dialog.showOpenDialog({
        title: "选择用于比较的旧版 Word 文档",
        defaultPath: defaultPath || undefined,
        filters: [{ name: "Word 文档", extensions: ["docx"] }],
        properties: ["openFile"],
      });
      if (res.canceled || !res.filePaths?.length) return null;
      return res.filePaths[0];
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Reveal a file in the system file manager (best effort).
 */
export function showItemInFolder(filePath: string): boolean {
  const remote = getElectronRemote();
  if (remote?.shell?.showItemInFolder) {
    try {
      remote.shell.showItemInFolder(filePath);
      return true;
    } catch {
      // ignore
    }
  }
  return false;
}
