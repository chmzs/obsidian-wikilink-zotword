# 交叉引用示例

> 本文件为 pandoc-crossref 模式的语法示例，可在 Obsidian 中作为沙盒笔记试手。
> 语法说明与效果图见 [tutorial.md](tutorial.md)。

## Figure with custom label

```markdown
> [!figure] 图 1-1 实验组与对照组指标变化 | Fig. 1-1. Indicator changes of the experimental and control groups.
> 数据说明文字
>
> ![](fig1.png)

如 @fig:temp-curve 所示，……
```

### 子图引用（后缀 a/b/c）

```markdown
> [!figure] 双组对比结果 {#fig:groups}
> 说明文字
>
> ![](fig1.png)

如 @fig:groups a 和 @fig:groups b 和 @fig:groups c 所示。
```

## Table with custom label

```markdown
> [!table] 表 1-1 两组数据对比 | Tab. 1-1. Comparison of the two groups. {#tbl:comparison}
> 注：数据为合成示例
>
> | 组别 | 均值 | 来源 |
> |------|------|------|
> | 实验组 | 1.8 | Smith, 2023 |
> | 对照组 | 1.0 | Jones, 2024 |

如表 @tbl:comparison 所示。
```

## Equation

```markdown
$$y = ax^2 + bx + c$$ {#eq:quadratic}

如 @eq:quadratic 所示。
```

## Mixed usage

```markdown
如 @fig:groups、@tbl:comparison 和 @eq:quadratic 所示。
```

## 语法要点

- 自定义标签 `{#fig:xxx}` 写在题注行末尾；标签只能用 **字母、数字、连字符**（不支持下划线，推荐连字符：`fig:groups`）
- 双语题注用 `|` 分隔中英文（详见 tutorial 第四节）
- 行内引用 `@label` 与编号之间要有空格，`@label` 后可直接跟子图后缀（`a`/`b`，用空格分隔）
