import { REMOTE_DB } from '../../src/constants/remoteDb';
import {
  File,
  __mockFsStore,
  __resetMockFileSystem,
} from '../../__mocks__/expo-file-system';
import {
  getDatabaseDirectory,
  getDatabaseFileNames,
  hasLocalDatabases,
  syncRemoteDatabases,
} from '../../src/data/sync';

describe('syncRemoteDatabases', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    __resetMockFileSystem();
    globalThis.fetch = jest.fn() as typeof fetch;
    jest.spyOn(File, 'downloadFileAsync');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function mockHead(headers: Record<string, string>) {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      headers: {
        get: (key: string) => headers[key.toLowerCase()] ?? headers[key] ?? null,
      },
    });
  }

  it('downloads both sqlite files on first sync via staging', async () => {
    mockHead({
      'content-length': '100',
      'last-modified': 'Wed, 16 Jul 2026 00:00:00 GMT',
    });

    const result = await syncRemoteDatabases(false);

    expect(File.downloadFileAsync).toHaveBeenCalledTimes(2);
    const destinations = (File.downloadFileAsync as jest.Mock).mock.calls.map(
      (call) => (call[1] as File).uri
    );
    expect(destinations.every((uri: string) => uri.endsWith('.download'))).toBe(true);
    expect(result.videosUri).toContain(REMOTE_DB.videos.fileName);
    expect(result.channelsUri).toContain(REMOTE_DB.channels.fileName);
    expect(result.updated).toBe(true);
    expect(hasLocalDatabases()).toBe(true);
    expect(getDatabaseFileNames()).toEqual({
      videos: 'videos.sqlite',
      channels: 'channels.sqlite',
    });
    expect(getDatabaseDirectory()).toContain('sqlite-remote');
    expect(__mockFsStore().has(result.videosUri)).toBe(true);
    expect(__mockFsStore().has(`${result.videosUri}.download`)).toBe(false);
  });

  it('skips download when meta and remote headers match', async () => {
    mockHead({
      'content-length': '100',
      'last-modified': 'Wed, 16 Jul 2026 00:00:00 GMT',
    });

    await syncRemoteDatabases(false);
    (File.downloadFileAsync as jest.Mock).mockClear();

    const second = await syncRemoteDatabases(false);
    expect(File.downloadFileAsync).not.toHaveBeenCalled();
    expect(second.updated).toBe(false);
  });

  it('force=true always redownloads through staging', async () => {
    mockHead({
      'content-length': '100',
      'last-modified': 'Wed, 16 Jul 2026 00:00:00 GMT',
    });

    await syncRemoteDatabases(false);
    const liveUri = new File(
      { uri: 'file:///mock-document/sqlite-remote' },
      'videos.sqlite'
    ).uri;
    expect(__mockFsStore().has(liveUri)).toBe(true);

    (File.downloadFileAsync as jest.Mock).mockClear();
    await syncRemoteDatabases(true);
    expect(File.downloadFileAsync).toHaveBeenCalledTimes(2);
    expect(__mockFsStore().has(liveUri)).toBe(true);
  });

  it('redownloads when content-length changes', async () => {
    mockHead({
      'content-length': '100',
      'last-modified': 'Wed, 16 Jul 2026 00:00:00 GMT',
    });

    await syncRemoteDatabases(false);

    mockHead({
      'content-length': '999',
      'last-modified': 'Wed, 16 Jul 2026 00:00:00 GMT',
    });

    (File.downloadFileAsync as jest.Mock).mockClear();
    const result = await syncRemoteDatabases(false);
    expect(File.downloadFileAsync).toHaveBeenCalledTimes(2);
    expect(result.updated).toBe(true);
  });

  it('continues when HEAD fails (empty remote meta)', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('network'));

    const result = await syncRemoteDatabases(false);
    expect(result.videosUri).toContain('videos.sqlite');
  });

  it('treats corrupt meta JSON as missing and redownloads', async () => {
    mockHead({
      'content-length': '100',
      'last-modified': 'Wed, 16 Jul 2026 00:00:00 GMT',
    });
    await syncRemoteDatabases(false);

    for (const name of ['videos.sqlite.meta.json', 'channels.sqlite.meta.json']) {
      const meta = new File({ uri: 'file:///mock-document/db-meta' }, name);
      meta.write('{broken');
    }

    (File.downloadFileAsync as jest.Mock).mockClear();
    await syncRemoteDatabases(false);
    expect(File.downloadFileAsync).toHaveBeenCalledTimes(2);
  });

  it('preserves previous meta fields when HEAD returns empty headers on force sync', async () => {
    mockHead({
      'content-length': '100',
      'last-modified': 'Wed, 16 Jul 2026 00:00:00 GMT',
    });
    await syncRemoteDatabases(false);

    (globalThis.fetch as jest.Mock).mockResolvedValue({
      headers: { get: () => null },
    });

    await syncRemoteDatabases(true);

    const meta = new File({ uri: 'file:///mock-document/db-meta' }, 'videos.sqlite.meta.json');
    const parsed = JSON.parse(await meta.text());
    expect(parsed.contentLength).toBe('100');
    expect(parsed.lastModified).toBe('Wed, 16 Jul 2026 00:00:00 GMT');
  });

  it('syncRemoteDatabases defaults force to false', async () => {
    mockHead({
      'content-length': '100',
      'last-modified': 'Wed, 16 Jul 2026 00:00:00 GMT',
    });
    await syncRemoteDatabases();
    expect(File.downloadFileAsync).toHaveBeenCalled();
  });

  it('hasLocalDatabases is false until both files exist', () => {
    expect(hasLocalDatabases()).toBe(false);
  });
});

describe('constants', () => {
  it('exposes remote sqlite URLs', () => {
    expect(REMOTE_DB.videos.fileName).toBe('videos.sqlite');
    expect(REMOTE_DB.channels.fileName).toBe('channels.sqlite');
  });
});
