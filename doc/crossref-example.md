---
crossref_lang: en
---

## Image with custom label

> [!figure] Temperature reconstruction {#fig:temp_curve}
> Source: compiled from multiple studies
>
> ![](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Grasslands-menggu.jpg/500px-Grasslands-menggu.jpg)

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
