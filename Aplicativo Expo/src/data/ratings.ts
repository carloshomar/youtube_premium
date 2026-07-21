import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../config/env';

const RATINGS_KEY = env.ratingsStorageKey;

export type VideoRating = 'like' | 'dislike';

export type RatingsStore = {
  version: 1;
  /** video_id → like | dislike */
  ratings: Record<string, VideoRating>;
};

function emptyStore(): RatingsStore {
  return { version: 1, ratings: {} };
}

/** Normalize stored JSON into RatingsStore. */
export function normalizeRatingsStore(parsed: unknown): RatingsStore {
  if (!parsed || typeof parsed !== 'object') return emptyStore();
  const obj = parsed as Partial<RatingsStore>;
  if (!obj.ratings || typeof obj.ratings !== 'object') return emptyStore();

  const ratings: Record<string, VideoRating> = {};
  for (const [id, value] of Object.entries(obj.ratings)) {
    if (value === 'like' || value === 'dislike') {
      ratings[String(id)] = value;
    }
  }
  return { version: 1, ratings };
}

async function readStore(): Promise<RatingsStore> {
  try {
    const raw = await AsyncStorage.getItem(RATINGS_KEY);
    if (!raw) return emptyStore();
    return normalizeRatingsStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: RatingsStore): Promise<void> {
  await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(store));
}

export async function getVideoRating(videoId: string): Promise<VideoRating | null> {
  const store = await readStore();
  return store.ratings[videoId] ?? null;
}

export async function getRatings(): Promise<Record<string, VideoRating>> {
  const store = await readStore();
  return { ...store.ratings };
}

export async function getDislikedVideoIds(): Promise<string[]> {
  const store = await readStore();
  return Object.entries(store.ratings)
    .filter(([, rating]) => rating === 'dislike')
    .map(([id]) => id);
}

/**
 * Set or clear a rating.
 * - Tapping the same rating again clears it.
 * - Like and dislike are mutually exclusive.
 */
export async function setVideoRating(
  videoId: string,
  rating: VideoRating
): Promise<VideoRating | null> {
  const store = await readStore();
  const current = store.ratings[videoId] ?? null;
  const next: VideoRating | null = current === rating ? null : rating;
  const ratings = { ...store.ratings };
  if (next) {
    ratings[videoId] = next;
  } else {
    delete ratings[videoId];
  }
  await writeStore({ version: 1, ratings });
  return next;
}

export async function clearRatings(): Promise<void> {
  await AsyncStorage.removeItem(RATINGS_KEY);
}
