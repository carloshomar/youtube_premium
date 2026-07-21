import { env } from '../config/env';

export type SyncMeta = {
  contentLength?: string | null;
  lastModified?: string | null;
  syncedAt?: string;
};

/** Pure freshness check used by remote SQLite sync. */
export function needsDownload(
  local: SyncMeta | null,
  remote: SyncMeta,
  fileExists: boolean
): boolean {
  if (!fileExists) return true;
  if (!local) return true;
  if (remote.contentLength && local.contentLength && remote.contentLength !== local.contentLength) {
    return true;
  }
  if (remote.lastModified && local.lastModified && remote.lastModified !== local.lastModified) {
    return true;
  }
  // If HEAD failed, still refresh if last sync is older than the configured stale window
  if (!remote.contentLength && !remote.lastModified && local.syncedAt) {
    const age = Date.now() - new Date(local.syncedAt).getTime();
    return age > env.syncStaleMs;
  }
  return false;
}
