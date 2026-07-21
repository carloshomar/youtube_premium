const mockOpenDatabaseAsync = jest.fn();
const mockCloseAsync = jest.fn();
const mockSyncRemoteDatabases = jest.fn();
const mockHasLocalDatabases = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpenDatabaseAsync(...args),
}));

jest.mock('../../src/data/sync', () => ({
  syncRemoteDatabases: (...args: unknown[]) => mockSyncRemoteDatabases(...args),
  hasLocalDatabases: (...args: unknown[]) => mockHasLocalDatabases(...args),
  getDatabaseDirectory: () => 'file:///mock-document/sqlite-remote',
  getDatabaseFileNames: () => ({
    videos: 'videos.sqlite',
    channels: 'channels.sqlite',
  }),
}));

import {
  __resetDatabasesForTests,
  getChannelsDb,
  getDbGeneration,
  getVideoListColumns,
  getVideosDb,
  hasVideosGenresColumn,
  initializeDatabases,
  refreshDatabases,
  subscribeDatabasesReopened,
} from '../../src/data/db';

describe('db lifecycle', () => {
  beforeEach(async () => {
    await __resetDatabasesForTests();
    mockOpenDatabaseAsync.mockReset();
    mockCloseAsync.mockReset();
    mockSyncRemoteDatabases.mockReset();
    mockHasLocalDatabases.mockReset().mockReturnValue(false);
    mockSyncRemoteDatabases.mockResolvedValue({
      videosUri: 'file:///videos.sqlite',
      channelsUri: 'file:///channels.sqlite',
      updated: true,
    });

    mockOpenDatabaseAsync.mockImplementation(async (name: string) => ({
      name,
      closeAsync: mockCloseAsync,
      getAllAsync: jest.fn().mockResolvedValue([{ name: 'genres' }, { name: 'video_id' }]),
    }));
  });

  it('throws before initialization', () => {
    expect(() => getVideosDb()).toThrow('Videos database not initialized');
    expect(() => getChannelsDb()).toThrow('Channels database not initialized');
  });

  it('first install syncs then opens both DBs', async () => {
    await initializeDatabases(false);
    expect(mockHasLocalDatabases).toHaveBeenCalled();
    expect(mockSyncRemoteDatabases).toHaveBeenCalledWith(false);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
    expect(getVideosDb()).toMatchObject({ name: 'videos.sqlite' });
    expect(getChannelsDb()).toMatchObject({ name: 'channels.sqlite' });
  });

  it('opens local DBs first and syncs in background when files exist', async () => {
    mockHasLocalDatabases.mockReturnValue(true);
    let resolveSync: (value: {
      videosUri: string;
      channelsUri: string;
      updated: boolean;
    }) => void = () => undefined;
    mockSyncRemoteDatabases.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = resolve;
        })
    );

    await initializeDatabases(false);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
    expect(mockSyncRemoteDatabases).toHaveBeenCalledWith(false);

    mockOpenDatabaseAsync.mockClear();
    const genBefore = getDbGeneration();
    const generations: number[] = [];
    const unsub = subscribeDatabasesReopened((g) => generations.push(g));

    await resolveSync({
      videosUri: 'v',
      channelsUri: 'c',
      updated: true,
    });
    await new Promise((r) => setImmediate(r));

    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
    expect(generations[0]).toBe(genBefore + 1);
    unsub();
  });

  it('initializeDatabases defaults forceSync to false', async () => {
    await initializeDatabases();
    expect(mockSyncRemoteDatabases).toHaveBeenCalledWith(false);
  });

  it('reuses in-flight/cached initPromise when forceSync=false', async () => {
    await initializeDatabases(false);
    await initializeDatabases(false);
    expect(mockSyncRemoteDatabases).toHaveBeenCalledTimes(1);
  });

  it('refreshDatabases forces sync and reopens', async () => {
    await initializeDatabases(false);
    mockSyncRemoteDatabases.mockClear();
    mockOpenDatabaseAsync.mockClear();

    await refreshDatabases();
    expect(mockSyncRemoteDatabases).toHaveBeenCalledWith(true);
    expect(mockCloseAsync).toHaveBeenCalled();
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
  });

  it('initializeDatabases(forceSync=true) bypasses cached promise', async () => {
    await initializeDatabases(false);
    mockSyncRemoteDatabases.mockClear();
    await initializeDatabases(true);
    expect(mockSyncRemoteDatabases).toHaveBeenCalledWith(true);
  });

  it('clears initPromise when first-install sync fails so retry is possible', async () => {
    mockSyncRemoteDatabases.mockRejectedValueOnce(new Error('boom'));
    await expect(initializeDatabases(false)).rejects.toThrow('boom');

    mockSyncRemoteDatabases.mockResolvedValueOnce({
      videosUri: 'v',
      channelsUri: 'c',
      updated: true,
    });
    await expect(initializeDatabases(false)).resolves.toBeUndefined();
  });

  it('background sync failure keeps last-good DBs open', async () => {
    mockHasLocalDatabases.mockReturnValue(true);
    mockSyncRemoteDatabases.mockRejectedValueOnce(new Error('offline'));
    await initializeDatabases(false);
    expect(getVideosDb()).toBeTruthy();
    await new Promise((r) => setImmediate(r));
    expect(getVideosDb()).toBeTruthy();
  });

  it('probes genres column and forces sync when missing', async () => {
    mockHasLocalDatabases.mockReturnValue(true);
    mockOpenDatabaseAsync.mockImplementation(async (name: string) => ({
      name,
      closeAsync: mockCloseAsync,
      getAllAsync: jest.fn().mockResolvedValue([{ name: 'video_id' }]),
    }));

    await initializeDatabases(false);
    expect(hasVideosGenresColumn()).toBe(false);
    expect(getVideoListColumns()).not.toContain('genres');
    expect(mockSyncRemoteDatabases).toHaveBeenCalledWith(true);
  });

  it('keeps genres in SELECT when schema has the column', async () => {
    mockHasLocalDatabases.mockReturnValue(true);
    await initializeDatabases(false);
    expect(hasVideosGenresColumn()).toBe(true);
    expect(getVideoListColumns()).toContain('genres');
    expect(mockSyncRemoteDatabases).toHaveBeenCalledWith(false);
  });
});
