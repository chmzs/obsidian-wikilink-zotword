import { describe, it, expect } from 'vitest';
import {
  wikilinkToCitekey,
  extractItemKey,
  extractCitations,
  preprocessMarkdown,
  buildPandocArgs,
} from '../src/preprocessor';

describe('wikilinkToCitekey', () => {
  it('converts English author correctly', () => {
    expect(wikilinkToCitekey('2018_Zhang_Holocene climate var_KEY-FLBB3YEH')).toBe('zhang2018-FLBB3YEH');
  });

  it('converts Chinese author correctly', () => {
    expect(wikilinkToCitekey('2023_陈发虎_全新世温度大暖期模式_KEY-4NX85H85')).toBe('陈发虎2023-4NX85H85');
  });

  it('handles apostrophes in author name', () => {
    expect(wikilinkToCitekey("2018_d’Alpoim Guedes_Climate change_KEY-NHBWJTS2")).toBe('dalpoimguedes2018-NHBWJTS2');
  });

  it('handles spaces in author name', () => {
    expect(wikilinkToCitekey('2018_Van Der Waals_Something_KEY-ABCDEF12')).toBe('vanderwaals2018-ABCDEF12');
  });

  it('returns original for malformed filename', () => {
    expect(wikilinkToCitekey('invalid')).toBe('invalid');
  });
});

describe('extractItemKey', () => {
  it('extracts 8-char key correctly', () => {
    expect(extractItemKey('2018_Zhang_Title_KEY-FLBB3YEH')).toBe('FLBB3YEH');
  });

  it('returns original for no match', () => {
    expect(extractItemKey('no_key_here')).toBe('no_key_here');
  });
});

describe('extractCitations', () => {
  it('extracts single citation', () => {
    const content = 'Text [[2018_Zhang_Title_KEY-FLBB3YEH|Zhang et al., 2018]] more text';
    const citations = extractCitations(content);
    expect(citations).toHaveLength(1);
    expect(citations[0].key).toBe('FLBB3YEH');
    expect(citations[0].alias).toBe('Zhang et al., 2018');
    expect(citations[0].citekey).toBe('zhang2018-FLBB3YEH');
  });

  it('extracts multiple citations', () => {
    const content = '[[2018_Zhang_KEY-FLBB3YEH|A]] and [[2021_Rao_KEY-W2D6EPGU|B]]';
    const citations = extractCitations(content);
    expect(citations).toHaveLength(2);
    expect(citations[0].key).toBe('FLBB3YEH');
    expect(citations[1].key).toBe('W2D6EPGU');
  });

  it('extracts Chinese author citations', () => {
    const content = '[[2023_陈发虎_标题_KEY-4NX85H85|陈发虎等, 2023]]';
    const citations = extractCitations(content);
    expect(citations[0].citekey).toBe('陈发虎2023-4NX85H85');
  });
});

describe('preprocessMarkdown', () => {
  it('converts wikilinks to [@citekey]', () => {
    const content = 'Text [[2018_Zhang_TITLE_KEY-FLBB3YEH|Zhang 2018]] end';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('[@zhang2018-FLBB3YEH]');
  });

  it('merges citations in parentheses', () => {
    const content = '([[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]; [[2021_Rao_TITLE_KEY-W2D6EPGU|B]])';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('[@zhang2018-FLBB3YEH; @rao2021-W2D6EPGU]');
  });

  it('handles Chinese parentheses', () => {
    const content = '（[[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]；[[2021_Rao_TITLE_KEY-W2D6EPGU|B]]）';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('[@zhang2018-FLBB3YEH; @rao2021-W2D6EPGU]');
  });

  it('removes outer parentheses around citation group', () => {
    const content = '([[2018_Zhang_TITLE_KEY-FLBB3YEH|A]])';
    const result = preprocessMarkdown(content, 'bbt');
    // Should not have outer parentheses
    expect(result).not.toMatch(/\(\[@/);
    expect(result).toContain('[@zhang2018-FLBB3YEH]');
  });

  it('lite mode uses itemKey', () => {
    const content = '[[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]';
    const result = preprocessMarkdown(content, 'lite');
    expect(result).toContain('[@FLBB3YEH]');
  });

  it('adds YAML frontmatter', () => {
    const content = '[[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('zotero_client: zotero');
  });

  it('converts regular wikilinks to plain text', () => {
    const content = 'See [[Page Name]] and [[Page|Display]]';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('Page Name');
    expect(result).toContain('Display');
  });

  it('converts image embeds', () => {
    const content = '![[image.png]] and ![[img.png|200]]';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![](image.png)');
    expect(result).toContain('![](img.png){ width=200 }');
  });

  it('converts image embed with caption to fig crossref', () => {
    const content = '![[fig1.png|长江中下游花粉重建结果]]';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![长江中下游花粉重建结果](fig1.png){#fig:fig1}');
  });

  it('distinguishes caption from size parameter', () => {
    const content = '![[img.png|200]] and ![[img2.png|题注文字]]';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![](img.png){ width=200 }');
    expect(result).toContain('![题注文字](img2.png){#fig:img2}');
  });

  it('converts standard markdown image with caption to fig crossref', () => {
    const content = '![长江中下游花粉重建结果](D:/附件/fig1.png)';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![长江中下游花粉重建结果](D:/附件/fig1.png){#fig:fig1}');
  });

  it('converts standard markdown image with size parameter', () => {
    const content = '![题注|200](image.png)';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![题注](image.png){ width=200 }');
  });

  it('does not add fig label to empty alt text', () => {
    const content = '![](image.png)';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![](image.png)');
    expect(result).not.toContain('{#fig:');
  });

  it('converts figure callout to pandoc figure with annotation', () => {
    const content = `> [!figure] 图 1 长江中下游花粉重建结果
> 该数据基于 12 个采样点。
>
> ![](D:/附件/fig1.png)`;
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![图 1 长江中下游花粉重建结果](D:/附件/fig1.png){#fig:1}');
    expect(result).toContain('该数据基于 12 个采样点。');
    expect(result).not.toContain('> [!figure]');
  });

  it('converts table callout to pandoc table with annotation', () => {
    const content = `> [!table] 表 1 不同代用指标的气候意义
> 数据来源：综合多篇文献。
>
> | 指标 | 信号 |
> |------|------|
> | 花粉 | 温度 |`;
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain(': 表 1 不同代用指标的气候意义 {#tbl:1}');
    expect(result).toContain('| 指标 | 信号 |');
    expect(result).toContain('数据来源：综合多篇文献。');
    expect(result).not.toContain('> [!table]');
  });

  it('converts callouts to blockquotes', () => {
    const content = '> [!note] This is a note';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('> **Note**: This is a note');
  });
});

describe('preprocessMarkdown with BBT citekey map', () => {
  it('uses provided citekey map', () => {
    const content = '[[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]';
    const map = { FLBB3YEH: 'custom-citekey' };
    const result = preprocessMarkdown(content, 'bbt', map);
    expect(result).toContain('[@custom-citekey]');
  });
});

describe('preprocessMarkdown - image embed edge cases', () => {
  it('converts image embed with Chinese path', () => {
    const content = '![[附件/图片.png]]';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![](附件/图片.png)');
  });

  it('converts image embed with size', () => {
    const content = '![[chart.png|400]]';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![](chart.png){ width=400 }');
  });

  it('does not confuse image embed with citation wikilink', () => {
    const content = '![[image_KEY-ABCDEF12.png]] and [[2018_Zhang_TITLE_KEY-FLBB3YEH|Zhang]]';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('![](image_KEY-ABCDEF12.png)');
    expect(result).toContain('[@zhang2018-FLBB3YEH]');
  });
});

describe('preprocessMarkdown - parenthesized citations edge cases', () => {
  it('merges three citations in parentheses', () => {
    const content = '([[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]; [[2021_Rao_TITLE_KEY-W2D6EPGU|B]]; [[2023_Chen_TITLE_KEY-4NX85H85|C]])';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('[@zhang2018-FLBB3YEH; @rao2021-W2D6EPGU; @chen2023-4NX85H85]');
  });

  it('handles mixed separators in parentheses', () => {
    const content = '([[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]、[[2021_Rao_TITLE_KEY-W2D6EPGU|B]])';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('[@zhang2018-FLBB3YEH; @rao2021-W2D6EPGU]');
  });

  it('preserves text around parenthesized citations', () => {
    const content = 'As shown in ([[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]; [[2021_Rao_TITLE_KEY-W2D6EPGU|B]]), the data suggests...';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('As shown in');
    expect(result).toContain('[@zhang2018-FLBB3YEH; @rao2021-W2D6EPGU]');
    expect(result).toContain('the data suggests');
  });

  it('handles multiple parenthesized groups', () => {
    const content = '([[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]) and ([[2021_Rao_TITLE_KEY-W2D6EPGU|B]])';
    const result = preprocessMarkdown(content, 'bbt');
    expect(result).toContain('[@zhang2018-FLBB3YEH]');
    expect(result).toContain('[@rao2021-W2D6EPGU]');
  });
});

describe('buildPandocArgs', () => {
  it('builds basic args', () => {
    const args = buildPandocArgs('in.md', 'out.docx', 'filter.lua');
    expect(args).toContain('--from');
    expect(args).toContain('markdown');
    expect(args).toContain('--to');
    expect(args).toContain('docx');
    expect(args).toContain('--lua-filter');
    expect(args).toContain('filter.lua');
    expect(args).toContain('-o');
    expect(args).toContain('out.docx');
  });

  it('includes template path', () => {
    const args = buildPandocArgs('in.md', 'out.docx', 'filter.lua', 'template.docx');
    expect(args).toContain('--reference-doc');
    expect(args).toContain('template.docx');
  });

  it('includes crossref metadata', () => {
    const args = buildPandocArgs('in.md', 'out.docx', 'filter.lua', undefined, {
      figPrefix: '图',
      tblPrefix: '表',
      eqnPrefix: '式',
      chapDelim: '.',
      autoSectionLabels: true,
    });
    expect(args).toContain('--metadata=figPrefix:图');
    expect(args).toContain('--metadata=tblPrefix:表');
    expect(args).toContain('--metadata=eqnPrefix:式');
    expect(args).toContain('--metadata=chapDelim:.');
    expect(args).toContain('--metadata=autoSectionLabels:true');
  });

  it('includes crossref filter path', () => {
    const args = buildPandocArgs('in.md', 'out.docx', 'filter.lua', undefined, undefined, '/tools/pandoc-crossref.exe');
    expect(args).toContain('--filter');
    expect(args).toContain('/tools/pandoc-crossref.exe');
  });


});