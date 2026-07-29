---
crossref_lang: zh
---

## 图片引用

> [!figure] 温度重建结果 {#fig:temp-curve}
> 说明文字
>
> ![](https://pics3.baidu.com/feed/bba1cd11728b4710eb8a2604c17946f2fe032393.jpeg@f_auto?token=770aecc5e3c465ca694147eb252cb847)

如 @fig:temp-curve 所示。

---

## 表格引用

> [!table] 代用指标对比 {#tbl:proxies}
> 说明
>
> | 指标 | 信号 | 来源 |
> |------|------|------|
> | 花粉 | 温度 | Smith, 2023 |
> | 石笋 | 降水 | Jones, 2024 |

如 @tbl:proxies 所示。

---

## 公式引用

$$y = ax^2 + bx + c$$ {#eq:quadratic}

如 @eq:quadratic 所示。

---

## 子图引用

同一张图内有多个子图时，标签名相同，引用时加 `_a` `_b` 后缀：

> [!figure] 温度重建结果 {#fig:subfig}
> 子图 A
>
> ![](https://pics3.baidu.com/feed/bba1cd11728b4710eb8a2604c17946f2fe032393.jpeg@f_auto?token=770aecc5e3c465ca694147eb252cb847)

> [!figure] 温度重建结果 {#fig:subfig}
> 子图 B
>
> ![](https://pics3.baidu.com/feed/bba1cd11728b4710eb8a2604c17946f2fe032393.jpeg@f_auto?token=770aecc5e3c465ca694147eb252cb847)

如 @fig:subfig_a 和 @fig:subfig_b 所示。

---

## 命名规则

- 标签名只允许 `a-zA-Z0-9-`，用 `-` 连接单词：`{#fig:temp-curve}`
- 标签名**不允许**下划线：`{#fig:temp_curve}` ❌
- 子图后缀用 `_` + 单字母：`@fig:name_a` → `图 N a`
- 引用与标签名精确匹配：`@fig:temp-curve` → `图 1`
- YAML 切换中英文：`crossref_lang: zh` / `crossref_lang: en`
