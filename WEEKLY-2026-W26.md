# obsidian-wikilink-zotword 开发周记 (2026-W26)

## 本周核心成果

### ✅ 核心功能完备
- **双模式导出**：BBT 模式（完整版，需 BBT）+ Lite 模式（仅需 Zotero）
- **引用格式**：支持 `[[year_Author_TITLE_KEY-XXXXXXXX|alias]]` 格式
- **多引用合并**：同一括号内 `; ` / `；` 自动合并为 `[@a; @b]`
- **特殊字符处理**：`d'Alpoim` → `dalpoimguedes`（去撇号）
- **中文括号支持**：`（...）` 与 `(...)` 等价
- **活引文**：生成 `ADDIN ZOTERO_ITEM` 域代码，Word 中可 Refresh
- **Word 模板**：`--reference-doc` 支持自定义页眉页脚样式
- **输出路径提示**：成功/失败均显示完整路径

### 🐛 关键 Bug 修复
| 问题 | 原因 | 解决 |
|------|------|------|
| `d'Alpoim` 撇号不匹配 | BBT citekey 生成去撇号，本地构造保留 | BBT 配置 `citekeyUnsafeChars` 加 `’` + 本地构造也去撇号 |
| Lite 模式随机失败 | 双 HTTP 请求竞争 + 脆弱匹配 | 合并为单批量请求 + 强化反查逻辑 |
| Lua 5.3+ 兼容 | `math.randomseed(os.clock()^5)` 非整数 | 改 `os.time()` |
| BBT `/export/item` bug | 特殊撇号导致 500 | 改用 Zotero 原生 `/api/users/0/items` |

### 📦 项目基建
- **测试体系**：vitest 单元测试 20 例（preprocessor 核心逻辑全覆盖）
- **Git + CI/CD**：GitHub Actions (test → build → release)
- **文档完善**：README 含最小引用要求、配置指南、FAQ
- **双 filter**：`obsidian-zotero.lua` (BBT) + `zotero-lite.lua` (Lite)

---

## 技术债与遗留问题

| 项 | 状态 | 备注 |
|----|------|------|
| preprocessor 括号合并测试 2 例失败 | ❌ | 中文括号正则边界条件，需细调 |
| 标题层级调整 (`##`→`#`) | ⏳ | Pandoc `--shift-heading-level-by=-1` |
| 批量导出 | ⏳ | v0.3 |
| CAYW (边写边引) | ⏳ | v0.4 |

---

## 下周计划

1. **修复测试**：调通括号合并正则（中文/英文/混合）
2. **标题层级**：添加 `--shift-heading-level-by=-1` 参数
3. **Release v0.1.1**：打 tag 推 GitHub，触发 CI 生成 Release assets
4. **开始 v0.2**：批量导出 + 进度条 UI

---

## 思考与感悟

- **配置优于代码**：BBT 的 `citekeyUnsafeChars` 解决了代码层面难以完美处理的 Unicode 规范化问题
- **API 选型决定稳定性**：Lite 版从双请求改单批量请求，失败率从 ~30% 降至接近 0
- **测试即文档**：失败的测试倒逼出了正则边界条件的清晰定义

---

## 关键词
`BBT` `Zotero` `Pandoc` `活引文` `双模式` `CI/CD` `测试驱动`