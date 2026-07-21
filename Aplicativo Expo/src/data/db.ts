import * as SQLite from 'expo-sqlite';
import {
  getDatabaseDirectory,
  getDatabaseFileNames,
  hasLocalDatabases,
  syncRemoteDatabases,
} from './sync';
import { videoListColumns } from './types';

let videosDb: SQLite.SQLiteDatabase | null = null;
let channelsDb: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;
let backgroundSyncPromise: Promise<void> | null = null;
let dbGeneration = 0;
/** Assume present until schema probe says otherwise (keeps unit tests simple). */
let videosHasGenres = true;

type ReopenListener = (generation: number) => void;
const reopenListeners = new Set<ReopenListener>();

export function getDbGeneration(): number {
  return dbGeneration;
}

export function subscribeDatabasesReopened(listener: ReopenListener): () => void {
  reopenListeners.add(listener);
  return () => {
    reopenListeners.delete(listener);
  };
}

function notifyReopened() {
  dbGeneration += 1;
  for (const listener of reopenListeners) {
    listener(dbGeneration);
  }
}

export function hasVideosGenresColumn(): boolean {
  return videosHasGenres;
}

/** SELECT list compatible with the currently open videos.sqlite schema. */
export function getVideoListColumns(): string {
  return videoListColumns(videosHasGenres);
}

async function probeVideosGenresColumn(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(videos)');
    return cols.some((col) => col.name === 'genres');
  } catch {
    return false;
  }
}

async function refreshVideosSchema(): Promise<void> {
  if (!videosDb) {
    videosHasGenres = true;
    return;
  }
  videosHasGenres = await probeVideosGenresColumn(videosDb);
}

async function openDbs() {
  const directory = getDatabaseDirectory();
  const names = getDatabaseFileNames();

  const previousVideos = videosDb;
  const previousChannels = channelsDb;
  // Drop handles first so in-flight callers fail fast instead of hitting a closed resource.
  videosDb = null;
  channelsDb = null;

  if (previousVideos) {
    try {
      await previousVideos.closeAsync();
    } catch {
      // already closed
    }
  }
  if (previousChannels) {
    try {
      await previousChannels.closeAsync();
    } catch {
      // already closed
    }
  }

  videosDb = await SQLite.openDatabaseAsync(names.videos, { useNewConnection: true }, directory);
  channelsDb = await SQLite.openDatabaseAsync(names.channels, { useNewConnection: true }, directory);
  await refreshVideosSchema();
}

async function runBackgroundSync(force = false): Promise<void> {
  if (backgroundSyncPromise) return backgroundSyncPromise;

  backgroundSyncPromise = (async () => {
    try {
      const result = await syncRemoteDatabases(force);
      if (result.updated || force) {
        await openDbs();
        notifyReopened();
      }
    } catch {
      // Keep serving the last-good open databases.
    } finally {
      backgroundSyncPromise = null;
    }
  })();

  return backgroundSyncPromise;
}

export async function initializeDatabases(forceSync = false): Promise<void> {
  if (initPromise && !forceSync) {
    return initPromise;
  }

  initPromise = (async () => {
    if (forceSync) {
      await syncRemoteDatabases(true);
      await openDbs();
      notifyReopened();
      return;
    }

    if (hasLocalDatabases()) {
      await openDbs();
      // Stale local catalogs without `genres` need a forced re-download once.
      void runBackgroundSync(!videosHasGenres);
      return;
    }

    await syncRemoteDatabases(false);
    await openDbs();
  })();

  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

export async function refreshDatabases(): Promise<void> {
  initPromise = null;
  await syncRemoteDatabases(true);
  await openDbs();
  notifyReopened();
  initPromise = Promise.resolve();
}

export function getVideosDb(): SQLite.SQLiteDatabase {
  if (!videosDb) {
    throw new Error('Videos database not initialized');
  }
  return videosDb;
}

export function getChannelsDb(): SQLite.SQLiteDatabase {
  if (!channelsDb) {
    throw new Error('Channels database not initialized');
  }
  return channelsDb;
}

/** Test-only: clears module-level DB handles and init latch. */
export async function __resetDatabasesForTests(): Promise<void> {
  if (videosDb) {
    await videosDb.closeAsync();
    videosDb = null;
  }
  if (channelsDb) {
    await channelsDb.closeAsync();
    channelsDb = null;
  }
  initPromise = null;
  backgroundSyncPromise = null;
  dbGeneration = 0;
  videosHasGenres = true;
  reopenListeners.clear();
}

/** Test-only: set genres schema flag without opening a real DB. */
export function __setVideosHasGenresForTests(value: boolean): void {
  videosHasGenres = value;
}
