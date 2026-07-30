---
crossref_lang: zh
---
## Image with custom label
> [!figure] Temperature reconstruction {#fig:temp-curve}
> Source: compiled from multiple studies
>
> ![](https://pics3.baidu.com/feed/bba1cd11728b4710eb8a2604c17946f2fe032393.jpeg@f_auto?token=770aecc5e3c465ca694147eb252cb847)

As shown in @fig:temp-curve.

![](https://pics3.baidu.com/feed/bba1cd11728b4710eb8a2604c17946f2fe032393.jpeg@f_auto?token=770aecc5e3c465ca694147eb252cb847)

> [!figure] Temperature reconstruction {#fig:temp-curve2}
> Source: compiled from multiple studies
>
> ![](https://pics3.baidu.com/feed/bba1cd11728b4710eb8a2604c17946f2fe032393.jpeg@f_auto?token=770aecc5e3c465ca694147eb252cb847)

As shown in @fig:temp-curve2 a 和 @fig:temp-curve2 b 和@fig:temp-curve2 c.
 @fig:temp2 b

## Table with custom label
> [!table] Proxy comparison {#tbl:proxies}
> Note tex
> 
> | Proxy | Signal | Source |
> |-------|--------|--------|
> | Pollen A | Temperature | Smith, 2023 |
> | Stalagmite B | Precipitation | Jones, 2024 |

As shown in @tbl:proxies.


> [!table] Proxy comparison {#tbl:proxies2}
> Note text
>
> | Proxy | Signal | Source |
> |-------|--------|--------|
> | Pollen A | Temperature | Smith, 2023 |
> | Stalagmite B | Precipitation | Jones, 2024 |

As shown in @tbl:proxies2.
As shown in @tbl:proxies2 b.

## Equation
$$y = ax^2 + bx + c$$ {#eq:quadratic}
As shown in @eq:quadratic.


$$y = ax^2 + bx + c$$ {#eq:quadratic2}
As shown in @eq:quadratic2


## Mixed usage
As shown in @fig:temp_curve, @tbl:proxies and @eq:quadratic.


## Usage
- `> [!figure] Caption {#fig:name}` → custom label, reference with `@fig:name`
- `> [!table] Caption {#tbl:name}` → custom label, reference with `@tbl:name`
- `$$...$$ {#eq:name}` → equation label, reference with `@eq:name`
- YAML frontmatter: `crossref_lang: zh` for Chinese, `crossref_lang: en` for English
