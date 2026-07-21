import {
  formatDuration,
  formatUploadDate,
  formatViews,
  normalizeGenre,
  parseCategories,
  parseGenres,
  sharedGenreCount,
} from '../../src/utils/format';

describe('formatViews', () => {
  it('returns 0 for nullish and NaN', () => {
    expect(formatViews(null)).toBe('0');
    expect(formatViews(undefined)).toBe('0');
    expect(formatViews(Number.NaN)).toBe('0');
  });

  it('keeps small numbers as-is', () => {
    expect(formatViews(0)).toBe('0');
    expect(formatViews(999)).toBe('999');
  });

  it('formats thousands with K', () => {
    expect(formatViews(1000)).toBe('1K');
    expect(formatViews(1500)).toBe('1.5K');
    expect(formatViews(12_000)).toBe('12K');
  });

  it('formats millions with M', () => {
    expect(formatViews(1_000_000)).toBe('1M');
    expect(formatViews(2_500_000)).toBe('2.5M');
  });
});

describe('formatDuration', () => {
  it('handles nullish and negative', () => {
    expect(formatDuration(null)).toBe('0:00');
    expect(formatDuration(undefined)).toBe('0:00');
    expect(formatDuration(-1)).toBe('0:00');
  });

  it('formats mm:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(179)).toBe('2:59');
  });

  it('formats h:mm:ss', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
  });
});

describe('formatUploadDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-16T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns empty for invalid input', () => {
    expect(formatUploadDate(null)).toBe('');
    expect(formatUploadDate('2026')).toBe('');
  });

  it('returns relative labels', () => {
    expect(formatUploadDate('20260716')).toBe('hoje');
    expect(formatUploadDate('20260715')).toBe('há 1 dia');
    expect(formatUploadDate('20260710')).toBe('há 6 dias');
    expect(formatUploadDate('20260620')).toBe('há 3 sem');
    expect(formatUploadDate('20260401')).toBe('há 3 meses');
    expect(formatUploadDate('20240716')).toBe('há 2 anos');
  });

  it('returns raw value when date cannot be parsed', () => {
    expect(formatUploadDate('abcdefgh')).toBe('abcdefgh');
  });
});

describe('parseCategories', () => {
  it('parses JSON arrays', () => {
    expect(parseCategories('["Education","Music"]')).toEqual(['Education', 'Music']);
  });

  it('returns empty for nullish', () => {
    expect(parseCategories(null)).toEqual([]);
    expect(parseCategories(undefined)).toEqual([]);
    expect(parseCategories('')).toEqual([]);
  });

  it('falls back to raw string when not JSON array', () => {
    expect(parseCategories('Education')).toEqual(['Education']);
    expect(parseCategories('{"a":1}')).toEqual(['{"a":1}']);
  });
});

describe('parseGenres', () => {
  it('splits comma-separated genres and normalizes', () => {
    expect(parseGenres('phonk, trap, lo-fi')).toEqual(['phonk', 'trap', 'lo-fi']);
    expect(parseGenres('Sertanejo')).toEqual(['sertanejo']);
    expect(parseGenres('MPB,  mpb , Funk')).toEqual(['mpb', 'funk']);
  });

  it('returns empty for blank genres', () => {
    expect(parseGenres(null)).toEqual([]);
    expect(parseGenres('')).toEqual([]);
    expect(parseGenres('  ,  ')).toEqual([]);
  });

  it('normalizeGenre strips accents', () => {
    expect(normalizeGenre('Sertanejo')).toBe('sertanejo');
    expect(normalizeGenre('  MPB  ')).toBe('mpb');
  });

  it('sharedGenreCount counts overlapping tokens', () => {
    expect(sharedGenreCount(['phonk', 'trap'], ['trap', 'lo-fi'])).toBe(1);
    expect(sharedGenreCount(['funk'], ['sertanejo'])).toBe(0);
    expect(sharedGenreCount([], ['funk'])).toBe(0);
  });
});
