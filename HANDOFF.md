# HANDOFF

> 跨会话状态交接点。新记录插最前面。

## 2026-09-13：收工

- 教程文档已推送 main（e982808）。因 docs 改动不进 zip，**不需要新 tag/Release**——插件功能版本仍是 v0.4.0
- 临时工作目录（/tmp/tutorial-gen、fig2、tmpl）已清理；仓库工作区干净
- 推广长版在 PaperBell 22_Blog 目录，待定稿

## 2026-09-13：图文教程 + 脱敏模板入库 + 文档整合

- 新增 `docs/tutorial.md` 图文教程（7 图）：安装/模式选型/修订对比/双语题注/模板/常见坑
- 新增 `docs/templates/academic-cn.dotx`：原"地球科学中文版_论文.dotx"脱敏版（core.xml/app.xml 元数据清理，重命名）；README 删除个人模板路径
- 图5/图6 用合成中性内容 + 模板管线重做（grep 确认无地球科学/盘星藻等字样）；教程示例同步中性化
- `doc/` 并入 `docs/`（crossref-example.md、callout-styles.css），收紧为 docs/ 单目录
- README/教程分工：README 概览 + 入口，docs/tutorial.md 手把手；README.en 同步（含 Zotero One 推荐改为青柠学术文章链接、致谢区同步）
- 教程配图：4 张用户截图（已检查无敏感信息）+ 2 张合成效果图 + zotero-one-promo.jpg
- mkchart 的 matplotlib 在 geo 环境创建 figure 时崩（exit 127 无输出），改用 PIL 手绘占位图绕过（环境问题，未深究）

## 2026-09-13：v0.4.0 已发布 + 部署 + 推广初稿

- 发布：commit fc6c19e，tag `v0.4.0`，CI 通过，Release 已带 `wikilink-zotword.zip`
- 部署：main.js/manifest/filters 已复制到 PaperBell vault 插件目录，obsidian.com 热重载成功，`export-revision-compare` 命令已验证注册
- 推广文初稿：PaperBell `02_输出/22_Blog/在 Obsidian 里写论文，交给导师的 Word 自带修订痕迹.md`（status: draft，已按用户意见补上 Lite 模式介绍；另有 300 字群发短版已交付；待用户定稿 + paper-deslop-zh 去 AI 味 + 封面图）
- 上一轮改动（修订对比/双语题注/AGENTS.md）见下一条记录，全部已随 v0.4.0 发布

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
