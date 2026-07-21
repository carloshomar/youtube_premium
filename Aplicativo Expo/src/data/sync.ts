import { Directory, File, Paths } from 'expo-file-system';
import { env } from '../config/env';
import { REMOTE_DB } from '../constants/remoteDb';
import { needsDownload, type SyncMeta } from './syncLogic';

type RemoteKey = keyof typeof REMOTE_DB;

const META_DIR = new Directory(Paths.document, env.dbMetaDirName);
const DB_DIR = new Directory(Paths.document, env.dbDirName);

function metaFile(key: RemoteKey): File {
  return new File(META_DIR, `${REMOTE_DB[key].fileName}.meta.json`);
}

function dbFile(key: RemoteKey): File {
  return new File(DB_DIR, REMOTE_DB[key].fileName);
}

function stagingFile(key: RemoteKey): File {
  return new File(DB_DIR, `${REMOTE_DB[key].fileName}.download`);
}

function ensureDirs() {
  if (!META_DIR.exists) {
    META_DIR.create({ intermediates: true, idempotent: true });
  }
  if (!DB_DIR.exists) {
    DB_DIR.create({ intermediates: true, idempotent: true });
  }
}

async function readMeta(key: RemoteKey): Promise<SyncMeta | null> {
  const file = metaFile(key);
  if (!file.exists) return null;
  try {
    return JSON.parse(await file.text()) as SyncMeta;
  } catch {
    return null;
  }
}

async function writeMeta(key: RemoteKey, meta: SyncMeta) {
  const file = metaFile(key);
  if (!file.exists) {
    file.create({ intermediates: true });
  }
  file.write(JSON.stringify(meta));
}

async function fetchRemoteHeaders(url: string): Promise<SyncMeta> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return {
      contentLength: res.headers.get('content-length'),
      lastModified: res.headers.get('last-modified'),
    };
  } catch {
    return {};
  }
}

/** Promote staging file into the live DB path without downloading onto an open live file. */
function promoteStaging(key: RemoteKey) {
  const live = dbFile(key);
  const staging = stagingFile(key);
  if (!staging.exists) {
    throw new Error(`Missing staging file for ${key}`);
  }
  if (live.exists) {
    live.delete();
  }
  staging.move(live);
}

async function syncOne(
  key: RemoteKey,
  force = false
): Promise<{ uri: string; updated: boolean }> {
  ensureDirs();
  const { url } = REMOTE_DB[key];
  const destination = dbFile(key);
  const localMeta = await readMeta(key);
  const remoteMeta = await fetchRemoteHeaders(url);

  if (!force && !needsDownload(localMeta, remoteMeta, destination.exists)) {
    return { uri: destination.uri, updated: false };
  }

  const staging = stagingFile(key);
  await File.downloadFileAsync(url, staging, { idempotent: true });
  promoteStaging(key);

  await writeMeta(key, {
    contentLength: remoteMeta.contentLength ?? localMeta?.contentLength ?? null,
    lastModified: remoteMeta.lastModified ?? localMeta?.lastModified ?? null,
    syncedAt: new Date().toISOString(),
  });

  return { uri: destination.uri, updated: true };
}

export function hasLocalDatabases(): boolean {
  ensureDirs();
  return dbFile('videos').exists && dbFile('channels').exists;
}

export type SyncRemoteResult = {
  videosUri: string;
  channelsUri: string;
  updated: boolean;
};

export async function syncRemoteDatabases(force = false): Promise<SyncRemoteResult> {
  const [videos, channels] = await Promise.all(
    force
      ? [syncOne('videos', true), syncOne('channels', true)]
      : [syncOne('videos'), syncOne('channels')]
  );
  return {
    videosUri: videos.uri,
    channelsUri: channels.uri,
    updated: videos.updated || channels.updated,
  };
}

export function getDatabaseDirectory(): string {
  ensureDirs();
  // expo-sqlite expects a directory URI/path without trailing filename
  return DB_DIR.uri;
}

export function getDatabaseFileNames() {
  return {
    videos: REMOTE_DB.videos.fileName,
    channels: REMOTE_DB.channels.fileName,
  };
}
