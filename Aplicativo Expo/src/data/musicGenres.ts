import { parseGenres, normalizeGenre } from '../utils/format';
import { relevanceScore } from './feedRanking';
import type { VideoRow } from './types';

export type GenreRepresentative = {
  /** Normalized genre key (e.g. `sertanejo`). */
  genreKey: string;
  /** Display label (e.g. `sertanejo` / first raw token). */
  genreLabel: string;
  video: VideoRow;
  /** Sum of local play counts across videos in this genre. */
  listenScore: number;
  /** Relevance of the chosen representative. */
  relevance: number;
};

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

/** Soft weight so more-listened / more-relevant genres surface earlier. */
export function genreListWeight(listenScore: number, relevance: number): number {
  return 1 + Math.log1p(Math.max(0, listenScore)) * 4 + Math.max(0, relevance) / 800;
}

/** Soft weight to pick a representative track inside a genre. */
export function trackPickWeight(playCount: number, relevance: number): number {
  return (1 + Math.max(0, playCount)) * Math.exp(Math.max(0, relevance) / 500);
}

type GenreBucket = {
  key: string;
  label: string;
  videos: VideoRow[];
  listenScore: number;
};

function buildBuckets(videos: VideoRow[], counts: Record<string, number>): GenreBucket[] {
  const map = new Map<string, GenreBucket>();

  for (const video of videos) {
    const raw = video.genres?.trim();
    const entries =
      raw && raw.length > 0
        ? raw.split(',').map((part) => {
            const label = part.trim();
            return { key: normalizeGenre(label), label };
          })
        : [{ key: 'outros', label: 'Outros' }];

    const seen = new Set<string>();
    for (const entry of entries) {
      if (!entry.key || seen.has(entry.key)) continue;
      seen.add(entry.key);
      let bucket = map.get(entry.key);
      if (!bucket) {
        bucket = {
          key: entry.key,
          label: entry.label || entry.key,
          videos: [],
          listenScore: 0,
        };
        map.set(entry.key, bucket);
      }
      bucket.videos.push(video);
      bucket.listenScore += counts[video.video_id] ?? 0;
    }
  }

  return Array.from(map.values());
}

function pickRepresentative(
  bucket: GenreBucket,
  counts: Record<string, number>,
  random: () => number
): VideoRow {
  if (bucket.videos.length === 1) return bucket.videos[0];
  const weights = bucket.videos.map((v) =>
    trackPickWeight(counts[v.video_id] ?? 0, relevanceScore(v))
  );
  return bucket.videos[weightedIndex(weights, random)];
}

/**
 * One Music track per genre, ordered with weighted randomness so
 * heavily listened / relevant genres tend to appear higher.
 */
export function buildMusicGenreFeed(
  videos: VideoRow[],
  counts: Record<string, number>,
  random: () => number = Math.random
): GenreRepresentative[] {
  const buckets = buildBuckets(videos, counts);
  if (buckets.length === 0) return [];

  const candidates: GenreRepresentative[] = buckets.map((bucket) => {
    const video = pickRepresentative(bucket, counts, random);
    return {
      genreKey: bucket.key,
      genreLabel: bucket.label,
      video,
      listenScore: bucket.listenScore,
      relevance: relevanceScore(video),
    };
  });

  if (candidates.length <= 1) return candidates;

  const remaining = [...candidates];
  const result: GenreRepresentative[] = [];

  while (remaining.length > 0) {
    remaining.sort((a, b) => {
      const aw = genreListWeight(a.listenScore, a.relevance);
      const bw = genreListWeight(b.listenScore, b.relevance);
      if (bw !== aw) return bw - aw;
      return a.genreLabel.localeCompare(b.genreLabel);
    });

    const weights = remaining.map((item) => genreListWeight(item.listenScore, item.relevance));
    const pickIndex = weightedIndex(weights, random);
    const [picked] = remaining.splice(pickIndex, 1);
    result.push(picked);
  }

  return result;
}

/** @internal */
export const __weightedIndexForTests = weightedIndex;

/** Re-export for callers that already have parsed genres. */
export { parseGenres };
