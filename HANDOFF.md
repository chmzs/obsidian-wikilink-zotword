# HANDOFF

> 跨会话状态交接点。新记录插最前面。

## 2025-会话：修订对比 + 双语题注 + AGENTS.md

### 本轮改动

1. **AGENTS.md 新建**：薄指针指向 CLAUDE.md（跨工具 agent 入口），约定开发指引只改 CLAUDE.md。
2. **修订对比功能**（`export-revision-compare` 命令，Windows + MS Word）：
   - `src/revision.ts`：PowerShell + Word COM。**坑已记录**：CompareDocuments 经 PIA 绑定时前两参是 Document 对象，须先 `Documents.Open`（只读）再传入；不能省略参数或传 Type.Missing（DISP_E_TYPEMISMATCH / 找不到重载）。
   - `src/compare-modal.ts`：弹窗预填 `settings.lastCompareDocx`，带文件存在性检查；Electron 原生选择器不可用时可直接粘贴路径。
   - `src/main.ts`：`exportCurrentNote` 重构为 `runWordExport()` 共享管线；COM 失败降级为"保留干净版 + 报错提示"。COM 冒烟测试已通过（真机 MS Word，pandoc 反读验证出原生 w:ins/w:del）。
   - 设置面板新增"修订对比"区块（`lastCompareDocx`）。
3. **双语图表题注**（callout 题注 `中文 | English`，翻译由用户自己完成）：
   - `src/preprocessor.ts`：figure/table callout 转换支持 `|` 分隔双语。Word 模式：硬换行两行题注（docx 内 `w:br`，已用真实图片 + XML 检查验证）；英文行字面输出。脚注模式：英文行自动加 `enOptions`（crossrefEn 设置）前缀 + 编号（`Fig. N` / `Tab. N`），参照向丽雄博士论文（Zotero 263B7S5G）的题注风格。
   - 管线打通：`applyMarkdownTransformations` / `cleanMarkdown` / `exportToMarkdownFootnotes` 增加第 5 参 `enOptions`；main.ts 传 `settings.crossrefEn`。
   - 注意：`|` 分隔符只对 callout 题注生效，普通图片嵌入 `![[file|caption]]` 不受影响。
4. 文档同步：README.md / README.en.md（导出模式表、双语题注节、修订对比节、设置表）、CLAUDE.md（文件结构、架构、关键约定）。

### 验证状态

- `npm test`：57/57 通过（新增 7 个双语题注用例）
- `npm run build`：main.js 29.7kb，dist/ + zip 产物正常
- Word COM 修订对比：真机冒烟通过；**未在 Obsidian 真实环境跑过完整命令**（弹窗 + 全流程），首次使用时注意
- 双语题注 Word 双行：pandoc AST + docx XML 双重验证通过

### 剩余问题 / 下一步

- 版本号未动（0.3.7）。发布时按发布流程统一三处版本号（注意 tag 锁定坑）。
- 未来计划里的"双语引文（中英文混合）"继续搁置（用户明确不做）；"多种导出格式""边写边引""批量导出"未动。
- 修订对比的 `showItemInFolder` 依赖 Electron remote，若新版 Obsidian 禁用 remote 会静默失败（只弹 Notice，不阻塞）。
