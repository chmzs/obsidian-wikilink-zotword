# CLAUDE.md

## 项目

obsidian-wikilink-zotword：Obsidian 插件，将 `[[wikilink]]` 格式的文献引用导出为 Word 中的 Zotero 引文。

## Zotero 笔记命名规则

Zotero One 导出到 Obsidian 的笔记文件名格式：

```
{year}_{firstAuthor}_{title_KEY-{itemKey}}.md
```

- **year**：出版年份
- **firstAuthor**：第一作者姓氏
- **title**：标题截断，英文 20 字符，中文 10 字符
- **itemKey**：`KEY-XXXXXXXX`（8 位大写字母数字，Zotero 自动生成）

示例：
- `2018_Zhang_Holocene climate var_KEY-FLBB3YEH.md`
- `2021_Rao_Cooling or warming c_KEY-W2D6EPGU.md`
- `2023_陈发虎_全新世温度大暖期_KEY-4NX85H85.md`

## Better BibTeX Citation Key 格式

`auth.lower + year + '-' + itemKey`

- 英文作者：转小写 → `zhang2018-FLBB3YEH`
- 中文作者：保持原样（无大小写）→ `陈发虎2023-4NX85H85`

## 引用转换规则

### 引文模式识别

Obsidian 中写作：
```
[[filename_KEY-XXXXXXXX|显示别名]]
```

### 分隔符

统一识别这些分隔符，按分组处理：

| 分隔符 | 用途 |
|--------|------|
| `；` `;` | 主要分隔符（同组引用） |
| `、` | 次要分隔符（同组引用） |
| `，` `,` | 个别情况（同组引用） |

### 转换示例

```
[[A]]；[[B]]；[[C]]
→ [@a2018-KEY1; @b2021-KEY2; @c2023-KEY3]

[[A]]; [[B]]; [[C]]
→ [@a2018-KEY1; @b2021-KEY2; @c2023-KEY3]

[[A]]；[[B]]、[[C]]
→ [@a2018-KEY1; @b2021-KEY2; @c2023-KEY3]

[[A]]，[[B]]，[[C]]
→ [@a2018-KEY1; @b2021-KEY2; @c2023-KEY3]

(...[[A]]；[[B]]...)
→ ([@a2018-KEY1; @b2021-KEY2])

[[A]]、[[B]]、[[C]]
→ [@a2018-KEY1; @b2021-KEY2; @c2023-KEY3]
```

### 正则提取

`/\[\[([^\]]*?_KEY-([A-Z0-9]{8}))\|([^\]]+?)\]\]/g`
- Group 1 = filename（含 year、firstAuthor）
- Group 2 = KEY
- Group 3 = 显示别名

### 转换逻辑

1. 提取所有 `[[..._KEY-XXX|...]]`
2. 分隔符（`；;、，`）统一为 `;`
3. 每个 KEY 构造 citekey：`firstAuthor.lower() + year + '-' + KEY`
4. 多个 citekey 用 `; ` 连接，包裹在 `[@...]` 中
5. 保持原有括号结构

## 架构

```
Obsidian 笔记
    ↓ 正则提取 KEY + year + author
    ↓ 构造 BBT citekey
    ↓ 预处理：wikilink → @citekey
    ↓
Pandoc + zotero.lua (BBT 提供)
    ↓ 连接 Zotero 获取 CSL-JSON
    ↓ 生成带域代码的 docx
    ↓
Word .docx (Zotero 活引文，可刷新)
```

## 依赖

- **Better BibTeX**：Zotero 插件，提供 citekey 和 zotero.lua
- **Pandoc**：≥ 2.16.2
- **zotero.lua**：从 BBT 获取，放到 `filters/` 目录

## Pandoc 调用

```bash
pandoc input.md \
  --lua-filter=zotero.lua \
  --metadata=zotero_client:zotero \
  --metadata=zotero_csl-style:china-national-standard-gb-t-7714-2015-numeric \
  -o output.docx
```

## 开发

```bash
npm install
npm run build    # 生产构建
npm run dev      # 开发监听
```

## 打包与安装

Obsidian 插件安装只需要三个文件：
- `main.js` — 编译输出
- `manifest.json` — 插件清单
- `styles.css` — 样式（可选）

本插件额外需要：
- `filters/obsidian-zotero.lua` — Pandoc Lua filter

安装方式：将上述文件复制到 `{vault}/.obsidian/plugins/wikilink-zotword/`

## 关键技术

- **Better BibTeX**：提供 citekey 和 zotero.lua 过滤器
- **zotero.lua**：BBT 提供的 Pandoc Lua 过滤器，生成 Zotero 活引文
- **CSL 样式**：通过 YAML metadata 指定（如 `china-national-standard-gb-t-7714-2015-numeric`）
- **Pandoc**：调用 zotero.lua 生成带域代码的 docx

## 待实现

### v0.2：批量导出 + 模板
- 选中多个笔记批量导出
- Word 模板选择（自定义页眉页脚、样式）
- 导出进度条

### v0.3：双语引文 + 引用格式
- 中英文混合引文支持

### v0.4：无需 BBT 的方案
- Zotero API 直查（不需要安装 Better BibTeX）
- 通过 Zotero MCP 搜索 + 匹配 citekey
- CSL 样式选择下拉框

