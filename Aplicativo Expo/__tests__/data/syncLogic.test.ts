import { needsDownload } from '../../src/data/syncLogic';

describe('needsDownload', () => {
  it('downloads when local file is missing', () => {
    expect(needsDownload({ contentLength: '10' }, { contentLength: '10' }, false)).toBe(true);
  });

  it('downloads when local meta is missing', () => {
    expect(needsDownload(null, { contentLength: '10' }, true)).toBe(true);
  });

  it('downloads when content-length changes', () => {
    expect(
      needsDownload(
        { contentLength: '10', lastModified: 'A' },
        { contentLength: '20', lastModified: 'A' },
        true
      )
    ).toBe(true);
  });

  it('downloads when last-modified changes', () => {
    expect(
      needsDownload(
        { contentLength: '10', lastModified: 'Mon' },
        { contentLength: '10', lastModified: 'Tue' },
        true
      )
    ).toBe(true);
  });

  it('skips download when headers match', () => {
    expect(
      needsDownload(
        { contentLength: '10', lastModified: 'Mon', syncedAt: new Date().toISOString() },
        { contentLength: '10', lastModified: 'Mon' },
        true
      )
    ).toBe(false);
  });

  it('refreshes when HEAD fails and sync is older than 1 hour', () => {
    const syncedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(needsDownload({ syncedAt }, {}, true)).toBe(true);
  });

  it('keeps cache when HEAD fails but sync is fresh', () => {
    const syncedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(needsDownload({ syncedAt }, {}, true)).toBe(false);
  });
});
