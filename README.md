# Wikilink to Zotero Word

将 Obsidian `[[wikilink]]` 格式的文献引用导出为 Word 中的 Zotero 活引文。

## 工作流程

```
Obsidian 笔记
    ↓ 正则提取 KEY + year + author
    ↓ 构造 BBT citekey（如 zhang2018-FLBB3YEH）
    ↓ 预处理：[[wikilink]] → [@citekey]
    ↓
Pandoc + obsidian-zotero.lua (BBT 提供)
    ↓ 连接 Zotero/BBT 获取 CSL-JSON
    ↓ 生成带 ADDIN ZOTERO_ITEM 域代码的 docx
    ↓
Word .docx (Zotero 活引文，可刷新/改格式)
```

## 引用格式（最小要求）

Obsidian 中写作，**必须包含 `KEY-XXXXXXXX` (8位大写字母数字)**：

```
[[2018_Zhang_Holocene climate var_KEY-FLBB3YEH|Zhang et al., 2018, ESR]]
```

**文件名格式**：`{year}_{firstAuthor}_{title_KEY-{itemKey}}`

**多引用**：同一对括号内用 `; ` 或 `；` 分隔（推荐）：

```
([[2018_吕厚远_中国史前农业起源演化_KEY-6GZZ9PFF|吕厚远, 2018]; [2024_贾鑫_早全新世生境改善促进_KEY-V2FXMG68|贾鑫, 2024]])
```

插件自动转换为 Pandoc citation：

```
[@lvh2018-6GZZ9PFF; @jia2024-V2FXMG68]
```

**注意**：
- 必须包含 `KEY-XXXXXXXX` (8位大写字母数字)
- 文件名中的作者名、年份用于构造 citekey
- 管道符 `|` 后的别名仅在 Obsidian 显示，导出时由 Zotero 替换为 CSL 格式

## 依赖

- **Obsidian** ≥ 1.0.0
- **Pandoc** ≥ 2.16.2（需在 PATH 中）
- **Zotero** + **Better BibTeX** 插件（BBT 模式运行时需开启）
- **Lite 模式**：仅需 Zotero（无需 BBT）

## 安装

1. 从 [Releases](https://github.com/your-repo/releases) 下载最新版 `dist.zip` 并解压
2. 将 `dist/` 文件夹中的所有文件复制到 `{vault}/.obsidian/plugins/wikilink-zotword/`
3. 在 Obsidian 设置 → 社区插件 → 启用 "Wikilink to Zotero Word"
4. **BBT 模式**：确保 Zotero 正在运行且 Better BibTeX 插件已安装
5. **Lite 模式**：仅需 Zotero 运行（无需 BBT）

## 使用

1. 打开包含 `[[wikilink]]` 引用的笔记
2. 命令面板 (Ctrl+P) → "Export to Word (Zotero Citations)"
3. 导出完成后，Notice 会显示输出文件完整路径
4. Word 中打开导出的 .docx，Zotero 会提示设置文档偏好（选择 CSL 样式）
5. 引用将以活引文形式存在，可右键 → Edit Field 刷新

## 设置

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| **Export mode** | `BBT` | `BBT`（完整版，需 BBT）或 `Lite`（仅需 Zotero） |
| **CSL style** | `china-national-standard-gb-t-7714-2015-numeric` | 引用样式 ID |
| **Output directory** | (空=笔记同目录) | 输出目录 |
| **Word template** | (空=默认模板) | 自定义 .docx 模板路径（预设页眉页脚、样式） |
| **Pandoc path** | `pandoc` | Pandoc 可执行文件路径（已在 PATH 可填 `pandoc`） |

### 模式对比

| 特性 | BBT 模式 | Lite 模式 |
|------|---------|----------|
| 依赖 | Zotero + BBT | 仅 Zotero |
| citekey 格式 | `author+year+itemKey` (如 `zhang2018-FLBB3YEH`) | 8位 itemKey (如 `FLBB3YEH`) |
| 稳定性 | 高（批量 API） | 中（单个 API，已优化批量查询） |
| 特殊字符 | 需 BBT 配置 `citekeyUnsafeChars` | 无特殊字符问题 |
| 推荐场景 | 日常学术写作、大量引用 | 无法安装 BBT 的环境 |

## 用户配置指南

### BBT 模式配置（推荐）

1. **安装 Better BibTeX**
   - Zotero → 工具 → 附加组件 → 获取更多附加组件 → 搜索 "Better BibTeX" 安装
   - 重启 Zotero

2. **配置特殊字符过滤**（解决 `d'Alpoim` 等弯撇号问题）
   - Zotero → 编辑 → 首选项 → 高级 → 配置编辑器
   - 搜索 `extensions.zotero.translators.better-bibtex.citekeyUnsafeChars`
   - 在值末尾添加弯撇号 `’`（U+2019）：`"#%'(),={}~’"`
   - 重启 Zotero
   - BBT → 管理引用键 → 重新生成所有引用键

3. **设置 CSL 样式**
   - 插件设置 → CSL style 填入样式 ID
   - 常用：`china-national-standard-gb-t-7714-2015-numeric` (GB/T 7714-2015 数字)
   - 更多样式：<https://www.zotero.org/styles>

### Lite 模式配置

- 无需 BBT，仅需 Zotero 运行
- 适用于无法安装 BBT 的环境（如某些受限机构电脑）
- citekey 直接使用 8位 itemKey（纯数字字母，无特殊字符问题）

### 自定义 Word 模板

1. 准备 `.docx` 模板（含页眉页脚、标题样式、正文字体等）
2. 插件设置 → Word template 填入模板绝对路径
3. 导出时会应用模板样式

## 常见问题 (FAQ)

### Q1: 导出后引文显示 `<open Zotero document preferences: [@xxx]>` 怎么办？
**A**: 这是正常的域代码占位符。在 Word 中点击 **Zotero** 选项卡 → **Refresh**，首次会弹出 Document Preferences 对话框，选择 CSL 样式后即可正常显示。

### Q2: 引文格式不符合预期（如作者年份 vs 数字上标）
**A**: 检查插件设置的 CSL style 是否正确。首次 Refresh 时选择正确的样式。也可在 Word 的 Zotero 选项卡 → Document Preferences 重新选择。

### Q3: `d'Alpoim Guedes` 这类弯撇号作者导出失败
**A**: BBT 模式需配置 `citekeyUnsafeChars`（见上文配置指南），并重新生成引用键。Lite 模式无此问题。

### Q4: 导出报错 "找不到 Pandoc"
**A**: 确认 Pandoc 已安装且在 PATH 中。或在设置中填入完整路径（如 `D:/Program Files/Quarto/bin/tools/pandoc.exe`）。

### Q5: 导出报错 "同名 Word 被占用"
**A**: 关闭正在打开的同名 .docx 文件后重试。

### Q6: Lite 模式偶尔有引文不生成活引文
**A**: 已优化批量查询。若仍出现，请检查 Zotero 是否运行正常，或切换 BBT 模式。

### Q7: 引用格式里的中文作者（如 `陈发虎`）citekey 生成正确吗？
**A**: 正确。中文作者直接拼音不转小写，如 `陈发虎2023-4NX85H85`。

### Q8: 如何批量导出多个笔记？
**A**: 当前版本暂不支持批量导出，计划在 v0.3 实现。

## 开发

```bash
npm install
npm run dev      # 开发监听
npm run build    # 生产构建 → 输出到 dist/
```

## 项目结构

```
obsidian-wikilink-zotword/
├── src/
│   ├── main.ts          # 插件入口（命令、导出流程）
│   ├── preprocessor.ts  # wikilink → @citekey 转换
│   └── settings.ts      # 设置界面
├── filters/
│   ├── obsidian-zotero.lua   # BBT filter（修复 Lua 5.3+ 兼容、BBT /export/item bug）
│   └── zotero-lite.lua       # Lite filter（Zotero 原生 API 批量查询）
├── dist/                # 构建产物（直接复制到 vault 安装）
│   ├── main.js
│   ├── manifest.json
│   ├── styles.css
│   └── filters/
├── esbuild.config.mjs
├── package.json
└── tsconfig.json
```

## Zotero 笔记命名规则

Zotero One 导出到 Obsidian 的笔记文件名格式：

```
{year}_{firstAuthor}_{title_KEY-{itemKey}}.md
```

示例：`2018_Zhang_Holocene climate var_KEY-FLBB3YEH.md`

## BBT Citation Key 格式

```
author.toLowerCase() + year + '-' + itemKey
```

- 英文：`zhang2018-FLBB3YEH`
- 中文：`陈发虎2023-4NX85H85`

## 已完成

- ✅ wikilink 正则提取 + BBT citekey 构造（含特殊撇号处理）
- ✅ wikilink → `[@citekey]` 预处理 + 括号内多引用合并
- ✅ BBT zotero.lua filter 集成（Lua 5.3+ 兼容性补丁、修复 /export/item bug）
- ✅ Lite zotero-lua filter（Zotero 原生 API 批量查询）
- ✅ Zotero 活引文（ADDIN ZOTERO_ITEM 域代码）生成
- ✅ Obsidian 插件（命令面板导出 + 设置界面 + 导出路径提示）
- ✅ 双模式：BBT / Lite
- ✅ Word 模板支持
- ✅ dist/ 一键安装打包

## 未来计划

### v0.2：模板与双语引文
- Word 模板选择 UI
- 中英文混合引文支持

### v0.3：批量导出
- 选中多个笔记批量导出
- 导出进度条

### v0.4：边写边引 (CAYW)
- 命令面板搜索 Zotero 文献 → 插入 wikilink
- BBT / Lite 双模式支持

### v0.5：脚注与多格式导出
- Obsidian 脚注格式支持
- PDF / HTML / LaTeX 导出

## License

MIT