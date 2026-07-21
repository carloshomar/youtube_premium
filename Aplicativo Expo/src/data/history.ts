import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../config/env';

const HISTORY_KEY = env.historyStorageKey;
/** Keep enough IDs so the home feed can deprioritize already-watched videos. */
export const MAX_HISTORY = env.maxHistory;

export type HistoryStore = {
  version: 1;
  order: string[];
  counts: Record<string, number>;
};

function emptyStore(): HistoryStore {
  return { version: 1, order: [], counts: {} };
}

/** Normalize legacy `string[]` or v1 object into HistoryStore. */
export function normalizeHistoryStore(parsed: unknown): HistoryStore {
  if (Array.isArray(parsed)) {
    const order = parsed.map(String).slice(0, MAX_HISTORY);
    const counts: Record<string, number> = {};
    for (const id of order) {
      counts[id] = counts[id] ?? 1;
    }
    return { version: 1, order, counts };
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Partial<HistoryStore>;
    if (Array.isArray(obj.order)) {
      const order = obj.order.map(String).slice(0, MAX_HISTORY);
      const counts: Record<string, number> = {};
      const rawCounts =
        obj.counts && typeof obj.counts === 'object' ? (obj.counts as Record<string, unknown>) : {};
      for (const id of order) {
        const n = Number(rawCounts[id]);
        counts[id] = Number.isFinite(n) && n > 0 ? n : 1;
      }
      return { version: 1, order, counts };
    }
  }

  return emptyStore();
}

async function readStore(): Promise<HistoryStore> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return emptyStore();
    return normalizeHistoryStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: HistoryStore): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(store));
}

export async function addToHistory(videoId: string): Promise<void> {
  const store = await readStore();
  const counts = { ...store.counts };
  counts[videoId] = (counts[videoId] ?? 0) + 1;
  const order = [videoId, ...store.order.filter((id) => id !== videoId)].slice(0, MAX_HISTORY);

  const prunedCounts: Record<string, number> = {};
  for (const id of order) {
    prunedCounts[id] = counts[id] ?? 1;
  }

  await writeStore({ version: 1, order, counts: prunedCounts });
}

export async function getHistoryIds(): Promise<string[]> {
  const store = await readStore();
  return store.order;
}

export async function getHistoryCounts(): Promise<Record<string, number>> {
  const store = await readStore();
  return { ...store.counts };
}

/** Most recently played video IDs (MRU), capped at `limit`. */
export async function getRecentHistoryIds(limit = 10): Promise<string[]> {
  const store = await readStore();
  return store.order.slice(0, Math.max(0, limit));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
