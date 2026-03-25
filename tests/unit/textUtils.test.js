// tests/unit/textUtils.test.js
const { cleanText, chunkText, truncateToTokenLimit, estimateTokenCount } = require('../../server/utils/textUtils');

describe('cleanText', () => {
  it('returns empty string for null/undefined input', () => {
    expect(cleanText(null)).toBe('');
    expect(cleanText(undefined)).toBe('');
    expect(cleanText('')).toBe('');
  });

  it('normalizes line endings', () => {
    const result = cleanText('line1\r\nline2\rline3');
    expect(result).toBe('line1\nline2\nline3');
  });

  it('collapses multiple blank lines to max two', () => {
    const result = cleanText('a\n\n\n\n\nb');
    expect(result).not.toMatch(/\n{3,}/);
  });

  it('trims leading and trailing whitespace', () => {
    expect(cleanText('   hello   ')).toBe('hello');
  });

  it('removes null characters', () => {
    expect(cleanText('hello\0world')).toBe('hello world');
  });
});

describe('truncateToTokenLimit', () => {
  it('returns text unchanged if within limit', () => {
    const text = 'short text';
    expect(truncateToTokenLimit(text, 1000)).toBe(text);
  });

  it('truncates text that exceeds token limit', () => {
    const text = 'a'.repeat(10000);
    const result = truncateToTokenLimit(text, 100);
    expect(result.length).toBeLessThan(text.length);
    expect(result).toContain('[Content truncated');
  });
});

describe('estimateTokenCount', () => {
  it('estimates roughly 1 token per 4 chars', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokenCount(text)).toBe(100);
  });
});

describe('chunkText', () => {
  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText(null)).toEqual([]);
  });

  it('splits long text into multiple chunks', () => {
    const para = 'word '.repeat(200);
    const text = [para, para, para].join('\n\n');
    const chunks = chunkText(text, 300);
    expect(chunks.length).toBeGreaterThan(1);
  });
});
