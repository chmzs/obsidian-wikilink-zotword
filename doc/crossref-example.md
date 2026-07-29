---
crossref_lang: en
---

## Image with custom label

> [!figure] Temperature reconstruction {#fig:temp_curve}
> Source: compiled from multiple studies
>
> ![](https://pics3.baidu.com/feed/bba1cd11728b4710eb8a2604c17946f2fe032393.jpeg@f_auto?token=770aecc5e3c465ca694147eb252cb847)

As shown in @fig:temp_curve.

---

## Table with custom label

> [!table] Proxy comparison {#tbl:proxies}
> Note text
>
> | Proxy | Signal | Source |
> |-------|--------|--------|
> | Pollen A | Temperature | Smith, 2023 |
> | Stalagmite B | Precipitation | Jones, 2024 |

As shown in @tbl:proxies.

---

## Equation

$$y = ax^2 + bx + c$$ {#eq:quadratic}

As shown in @eq:quadratic.

---

## Mixed usage

As shown in @fig:temp_curve, @tbl:proxies and @eq:quadratic.

---

## Usage

- `> [!figure] Caption {#fig:name}` → custom label, reference with `@fig:name`
- `> [!table] Caption {#tbl:name}` → custom label, reference with `@tbl:name`
- `$$...$$ {#eq:name}` → equation label, reference with `@eq:name`
- YAML frontmatter: `crossref_lang: zh` for Chinese, `crossref_lang: en` for English
