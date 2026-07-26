import { describe, it, expect } from 'vitest';
import {
  wikilinkToCitekey,
  extractItemKey,
  extractCitations,
  preprocessMarkdown,
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
    const result = preprocessMarkdown(content, undefined, 'bbt');
    expect(result).toContain('[@zhang2018-FLBB3YEH]');
  });

  it('merges citations in parentheses', () => {
    const content = '([[2018_Zhang_TITLE_KEY-FLBB3YEH|A]; [2021_Rao_TITLE_KEY-W2D6EPGU|B]])';
    const result = preprocessMarkdown(content, undefined, 'bbt');
    expect(result).toContain('[@zhang2018-FLBB3YEH; @rao2021-W2D6EPGU]');
  });

  it('handles Chinese parentheses', () => {
    const content = '（[[2018_Zhang_TITLE_KEY-FLBB3YEH|A]；[[2021_Rao_TITLE_KEY-W2D6EPGU|B]）';
    const result = preprocessMarkdown(content, undefined, 'bbt');
    expect(result).toContain('[@zhang2018-FLBB3YEH; @rao2021-W2D6EPGU]');
  });

  it('removes outer parentheses around citation group', () => {
    const content = '([[2018_Zhang_TITLE_KEY-FLBB3YEH|A]])';
    const result = preprocessMarkdown(content, undefined, 'bbt');
    // Should not have outer parentheses
    expect(result).not.toMatch(/\(\[@/);
    expect(result).toContain('[@zhang2018-FLBB3YEH]');
  });

  it('lite mode uses itemKey', () => {
    const content = '[[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]';
    const result = preprocessMarkdown(content, undefined, 'lite');
    expect(result).toContain('[@FLBB3YEH]');
  });

  it('adds YAML frontmatter', () => {
    const content = '[[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]';
    const result = preprocessMarkdown(content, 'test-style', 'bbt');
    expect(result).toContain('zotero_client: zotero');
    expect(result).toContain('zotero_csl-style: test-style');
  });

  it('converts regular wikilinks to plain text', () => {
    const content = 'See [[Page Name]] and [[Page|Display]]';
    const result = preprocessMarkdown(content, undefined, 'bbt');
    expect(result).toContain('Page Name');
    expect(result).toContain('Display');
  });

  it('converts image embeds', () => {
    const content = '![[image.png]] and ![[img.png|200]]';
    const result = preprocessMarkdown(content, undefined, 'bbt');
    expect(result).toContain('![](image.png)');
    expect(result).toContain('![](img.png){ width=200 }');
  });

  it('converts callouts to blockquotes', () => {
    const content = '> [!note] This is a note';
    const result = preprocessMarkdown(content, undefined, 'bbt');
    expect(result).toContain('> **Note**: This is a note');
  });
});

describe('preprocessMarkdown with BBT citekey map', () => {
  it('uses provided citekey map', () => {
    const content = '[[2018_Zhang_TITLE_KEY-FLBB3YEH|A]]';
    const map = { FLBB3YEH: 'custom-citekey' };
    const result = preprocessMarkdown(content, undefined, 'bbt', map);
    expect(result).toContain('[@custom-citekey]');
  });
});