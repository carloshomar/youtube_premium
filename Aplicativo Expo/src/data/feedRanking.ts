import { env } from '../config/env';
import type { VideoRow } from './types';

/** Minimum calendar-day gap between consecutive feed items when possible. */
export const FEED_MIN_DAY_GAP = env.feedMinDayGap;

export type RankFeedOptions = {
  minDayGap?: number;
  /** Injected RNG in [0, 1) for deterministic tests. */
  random?: () => number;
};

/** Parse YTube-style `YYYYMMDD` upload dates to UTC midnight ms. */
export function parseUploadDateMs(uploadDate: string | null | undefined): number | null {
  if (!uploadDate || uploadDate.length < 8) return null;
  const y = Number(uploadDate.slice(0, 4));
  const m = Number(uploadDate.slice(4, 6));
  const d = Number(uploadDate.slice(6, 8));
  if (!y || !m || !d) return null;
  const ms = Date.UTC(y, m - 1, d);
  // Invalid numeric components already returned above; Date.UTC always yields a number.
  return ms;
}

/** Absolute day difference between two upload dates (0 if either is missing). */
export function uploadDayDiff(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const am = parseUploadDateMs(a);
  const bm = parseUploadDateMs(b);
  if (am == null || bm == null) return 0;
  return Math.abs(Math.round((am - bm) / 86_400_000));
}

/**
 * Higher = more relevant for the home feed.
 * Favors newer uploads, with a soft boost from views.
 */
export function relevanceScore(video: VideoRow): number {
  const dateMs = parseUploadDateMs(video.upload_date) ?? 0;
  const dayScore = dateMs / 86_400_000;
  const viewScore = Math.log1p(Math.max(0, video.view_count ?? 0)) * 3;
  return dayScore + viewScore;
}

function weightedIndex(weights: number[], random: () => number): number {
  if (weights.length === 0) return 0;
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return 0;
  let ticket = random() * total;
  for (let i = 0; i < weights.length - 1; i += 1) {
    ticket -= weights[i];
    if (ticket <= 0) return i;
  }
  return weights.length - 1;
}

/** @internal Exported for unit tests. */
export const __weightedIndexForTests = weightedIndex;

/**
 * Shuffle `pool` into a playlist that prefers newer/relevant items while
 * keeping at least `minDayGap` days between consecutive upload dates when possible.
 */
export function shuffleWithDayGap(
  pool: VideoRow[],
  minDayGap: number,
  random: () => number
): VideoRow[] {
  if (pool.length <= 1) return [...pool];

  const remaining = [...pool].sort((a, b) => relevanceScore(b) - relevanceScore(a));
  const result: VideoRow[] = [];

  while (remaining.length > 0) {
    const previous = result[result.length - 1];
    let eligible = previous
      ? remaining.filter((v) => uploadDayDiff(v.upload_date, previous.upload_date) >= minDayGap)
      : remaining;

    if (eligible.length === 0) {
      eligible = remaining;
    }

    const weights = eligible.map((v) => {
      const score = relevanceScore(v);
      // Softmax-ish: keep newer items more likely without hard ordering.
      return Math.exp(score / 400);
    });

    const pick = eligible[weightedIndex(weights, random)];
    result.push(pick);
    const idx = remaining.findIndex((v) => v.video_id === pick.video_id);
    remaining.splice(idx, 1);
  }

  return result;
}

/**
 * Rank the home feed:
 * 1) unwatched videos first (shuffled with day-gap + relevance bias)
 * 2) already-watched videos after (same rules, never prioritized)
 */
export function rankFeedVideos(
  videos: VideoRow[],
  watchedIds: Iterable<string>,
  options: RankFeedOptions = {}
): VideoRow[] {
  const minDayGap = options.minDayGap ?? FEED_MIN_DAY_GAP;
  const random = options.random ?? Math.random;
  const watched = new Set(watchedIds);

  const fresh: VideoRow[] = [];
  const seen: VideoRow[] = [];
  for (const video of videos) {
    if (watched.has(video.video_id)) {
      seen.push(video);
    } else {
      fresh.push(video);
    }
  }

  return [
    ...shuffleWithDayGap(fresh, minDayGap, random),
    ...shuffleWithDayGap(seen, minDayGap, random),
  ];
}

/** True for Music / Música / musica (case-insensitive, accents stripped). */
export function isMusicCategory(category?: string | null): boolean {
  if (!category) return false;
  const normalized = category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return normalized === 'music' || normalized === 'musica';
}

/**
 * Music feed: most locally played first; ties break by catalog relevance.
 * Recently played IDs (e.g. last 10) are pushed to the end so they are not
 * re-recommended immediately, while still remaining in the catalog.
 */
export function rankMusicFeed(
  videos: VideoRow[],
  counts: Record<string, number>,
  recentIds: Iterable<string> = []
): VideoRow[] {
  const recent = new Set(recentIds);
  const byListensThenRelevance = (a: VideoRow, b: VideoRow) => {
    const ca = counts[a.video_id] ?? 0;
    const cb = counts[b.video_id] ?? 0;
    if (cb !== ca) return cb - ca;
    return relevanceScore(b) - relevanceScore(a);
  };

  const cool: VideoRow[] = [];
  const hot: VideoRow[] = [];
  for (const video of videos) {
    if (recent.has(video.video_id)) {
      cool.push(video);
    } else {
      hot.push(video);
    }
  }

  return [...hot.sort(byListensThenRelevance), ...cool.sort(byListensThenRelevance)];
}

/** How many recent plays to keep out of the Music recommendation top. */
export const MUSIC_RECENT_COOLDOWN = env.musicRecentCooldown;
