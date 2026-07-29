# Wikilink to Zotero Word

> [English](README.en.md) | 中文

将 Obsidian `[[wikilink]]` 文献引用导出为 Word 中的 Zotero 活引文，或 Markdown 作者年份制脚注。

> [!tip] 推荐搭配
> 本插件与 [Zotero One](https://weixin.qq.com/sph/AE3FgkpLTt) 配合使用效果最佳——Zotero One 自动同步文献笔记到 Obsidian，本插件负责将写作成果导出为 Word。

## 为什么需要这个插件

Zotero 是优秀的文献管理软件，但其笔记管理与写作输出仍有不足——新时代我们急需将知识输入高效转化为学术发表。配合 Obsidian 原生的双链快捷引用和即时预览，论文写作体验十分流畅。

相比之下，Word 中直接通过 Zotero 插入文献显得迟缓，跳转回 Zotero 查阅原文也颇为繁琐。但 Word 仍是学术交流的硬通货——复杂排版、 CSL 样式切换、期刊投稿都离不开它。

**wikilink-zotword 正是为打通这"最后一公里"而生。** 借助 Better BibTeX 提供的 `zotero.lua`，我们将 Obsidian 中的双链引用无缝转换为 Word 中可动态更新的 Zotero 活引文（Live Citation），高效融合 Obsidian 写作的畅快与 Word 排版的专业能力，上手轻便。

## 三种导出模式

| 模式 | 命令 | 输出 | 依赖 |
|------|------|------|------|
| **BBT** | `Export to Word (Zotero Citations)` | `.docx`（活引文） | Zotero + BBT + Pandoc |
| **Lite** | 同上 | `.docx`（活引文） | Zotero + Pandoc |
| **脚注** | `Export to Markdown (Obsidian Footnotes + Zotero)` | `.md`（作者年份制脚注） | Zotero + Pandoc |

- **BBT**（推荐）：活引文最稳定，支持 CSL 样式切换，高级作者名处理
- **Lite**：无需安装 BBT，适合受限环境。生成的活引文可正常刷新
- **脚注**：适合微信公众号、博客等 Markdown 发布平台

## 安装

### 手动安装

1. 从 [Releases](https://github.com/your-repo/releases) 下载最新版 `dist.zip` 并解压
2. 将 `dist/` 文件夹中的所有文件复制到 `{vault}/.obsidian/plugins/wikilink-zotword/`
3. Obsidian 设置 → 社区插件 → 启用 "Wikilink to Zotero Word"

### 依赖安装

| 依赖 | 必需？ | 说明 |
|------|--------|------|
| [Pandoc](https://pandoc.org/installing.html) ≥ 2.16.2 | ✅ 全部模式 | 需在 PATH 中，或在设置中填入完整路径 |
| [Zotero](https://www.zotero.org/) | ✅ 全部模式 | 需运行（端口 23119） |
| [Better BibTeX](https://retorque.re/zotero-better-bibtex/) | 仅 BBT 模式 | Zotero 插件 |
| [pandoc-crossref](https://github.com/tomduck/pandoc-crossref) | 可选 | 图表公式交叉引用；Quarto 用户自动检测 |

## 快速上手

1. 安装插件和依赖
2. 打开一篇包含 `[[wikilink]]` 引用的笔记
3. `Ctrl+P` → `Export to Word (Zotero Citations)`
4. Word 中打开导出的 `.docx`，Zotero 会提示设置文档偏好

**就这么简单。**

> [!note] 引用格式
> 笔记中引用需要包含 Zotero 的 8 位 itemKey（Zotero One 自动生成）：
> ```
> [[2024_Smith_Advances in method_KEY-ABC12345|Smith et al., 2024, J. Sci.]]
> ```
> 管道符 `|` 后的别名仅在 Obsidian 中显示，导出时由 Zotero 替换为 CSL 格式。

## 图表题注与交叉引用

在 Obsidian 中使用 Callout 语法为图片和表格添加题注：

```markdown
> [!figure] 图 1 实验结果对比
> 说明文字
>
> ![](图片路径)

如 @fig:1 所示，……

> [!table] 表 1 参数对比
> 数据来源：综合文献
>
> | 参数 | 说明 |
> |------|------|
> | A | 描述1 |
> | B | 描述2 |

如 @tbl:1 所示，……

行内公式：$y = ax^2 + bx + c$ {#eq:quadratic}
如 @eq:quadratic 所示，……
```

> [!info] 交叉引用说明
> - `@fig:N` → "图 N"（引用第 N 张图片）
> - `@tbl:N` → "表 N"（引用第 N 个表格）
> - `@eq:name` → "式 N"（引用公式）
> - 前缀可在设置中自定义（如改为 `Fig.`、`Tab.`、`Eq.`）
> - 需安装 [pandoc-crossref](https://github.com/tomduck/pandoc-crossref)，Quarto 用户自动检测

## Markdown 脚注导出

适合微信公众号、博客、Notion 等 Markdown 发布平台。

1. 设置面板 → **CSL style file** 填入样式文件路径或 URL（默认 `apa`）
2. `Ctrl+P` → `Export to Markdown (Obsidian Footnotes + Zotero)`
3. 自动生成 `{文件名}_footnotes.md` 并在 Obsidian 中打开

输出效果：

```markdown
近年来该领域研究取得重要进展（(Smith et al., 2024)[^1]），
如 @fig:1 和 @tbl:1 所示。

## 参考文献
[^1]: Smith, J., et al. (2024). A study on...
     *Journal of Example Studies*, 12(3), 456-478.
```

- 正文：`作者 (年份)[^n]`（作者年份制）
- 文末：完整参考文献（含 DOI）
- 无需 BBT，仅需 Zotero 运行

## 设置

### 导出设置

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| Export mode | `BBT` | BBT / Lite |
| CSL style | `china-national-standard-gb-t-7714-2015-numeric` | 引用样式 ID |
| CSL style file | `apa` | 脚注导出的 CSL 样式（作者年份制推荐 APA） |
| Output directory | （空=笔记同目录） | Word 导出目录 |
| Word template | （空=默认模板） | 自定义 .docx 模板路径 |
| Pandoc path | `pandoc` | Pandoc 路径 |

### 图表交叉引用

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| Figure prefix | `图` | 图前缀 |
| Table prefix | `表` | 表前缀 |
| Equation prefix | `式` | 公式前缀 |
| pandoc-crossref path | （空=Quarto 内置） | 留空自动检测 |

## 用户配置指南

### BBT 模式（推荐）

1. Zotero → 工具 → 附加组件 → 获取更多附加组件 → 搜索 "Better BibTeX" → 安装 → 重启 Zotero
2. **配置引用键格式**：
   - BBT 默认公式为 `auth.lower + year`，建议改为 `auth.lower + year + '-' + item`（即 `{auth.lower}{year}-{item}`）
   - 末尾的 `+ item` 是 BBT 的关键词，用于在 citekey 中嵌入 8 位 item key，不可写为 `itemkey`
   - 若不包含 item key，Lite 模式无法匹配引用
3. **配置特殊字符过滤**（解决弯撇号问题）：
   - 编辑 → 首选项 → 高级 → 配置编辑器
   - 搜索 `extensions.zotero.translators.better-bibtex.citekeyUnsafeChars`
   - 值末尾添加弯撇号 `'`（U+2019）：`"#%'(),={}~'"`
   - 重启 Zotero → BBT → 管理引用键 → 重新生成所有引用键
3. 设置 CSL 样式：插件设置 → CSL style 填入样式 ID
   - 常用：`china-national-standard-gb-t-7714-2015-numeric`
   - 更多：<https://www.zotero.org/styles>

### Lite 模式

无需 BBT，仅需 Zotero 运行。适用于无法安装 BBT 的受限环境。

### 自定义 Word 模板

1. 准备 `.docx` 模板（含页眉页脚、标题样式、正文字体等）
2. 插件设置 → Word template 填入绝对路径
3. 导出时自动应用模板样式

## FAQ

<details>
<summary>导出后引文显示 `open Zotero document preferences: [@xxx]`</summary>

这是正常的域代码占位符。在 Word 中点击 **Zotero** → **Refresh**，首次弹出 Document Preferences 对话框，选择 CSL 样式后即可正常显示。
</details>

<details>
<summary>`d'cona Guedes` 等弯撇号作者导出失败</summary>

BBT 模式需配置 `citekeyUnsafeChars`（见上文配置指南）并重新生成引用键。Lite 模式无此问题。
</details>

<details>
<summary>找不到 Pandoc</summary>

确认 Pandoc 已安装且在 PATH 中。或在设置中填入完整路径（如 `D:/Program Files/Quarto/bin/tools/pandoc.exe`）。
</details>

<details>
<summary>同名 Word 被占用</summary>

关闭正在打开的同名 `.docx` 文件后重试。
</details>

<details>
<summary>中文作者 citekey 格式</summary>

中文作者保持原样（不转小写），如 `张三丰2023-4NX85H85`。
</details>

<details>
<summary>如何批量导出多个笔记？</summary>

当前版本暂不支持，计划在 v0.3 实现。
</details>

## 未来计划

- **v0.3** — 双语引文（中英文混合）
- **v0.4** — 多种导出格式支持（https://github.com/mokeyish/obsidian-enhancing-export、https://github.com/l1xnan/obsidian-better-export-pdf）
- **v0.5** — 边写边引：命令面板搜索 Zotero 文献 → 插入 wikilink
- **v0.6** — 批量导出多个笔记 + 导出进度条
  
## 开发

```bash
npm install
npm run dev      # 开发监听
npm run build    # 生产构建 → dist/
npm run test     # 运行测试
```

## 致谢

- [Better BibTeX](https://retorque.re/zotero-better-bibtex/) — 提供 `zotero.lua` Pandoc filter
- [Zotero One](https://weixin.qq.com/sph/AE3FgkpLTt) — 打通 Zotero 与 Obsidian
- [pandoc-crossref](https://github.com/tomduck/pandoc-crossref) — 图表公式交叉引用
- [Pandoc](https://pandoc.org/) — 文档格式转换引擎

## License

MIT
