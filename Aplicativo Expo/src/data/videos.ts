import { env } from '../config/env';
import { parseCategories, parseGenres, sharedGenreCount } from '../utils/format';
import { getVideoListColumns, getVideosDb, hasVideosGenresColumn } from './db';
import {
  isMusicCategory,
  MUSIC_RECENT_COOLDOWN,
  rankFeedVideos,
  rankMusicFeed,
} from './feedRanking';
import { getHistoryCounts, getHistoryIds, getRecentHistoryIds } from './history';
import { buildMusicGenreFeed, type GenreRepresentative } from './musicGenres';
import { getDislikedVideoIds } from './ratings';
import type { VideoRow } from './types';

const HORIZONTAL_WHERE = `(width IS NULL OR height IS NULL OR height <= width)`;
const VERTICAL_WHERE = `height IS NOT NULL AND width IS NOT NULL AND height > width`;

async function dislikedSet(): Promise<Set<string>> {
  return new Set(await getDislikedVideoIds());
}

function withoutDisliked(rows: VideoRow[], disliked: Set<string>): VideoRow[] {
  if (disliked.size === 0) return rows;
  return rows.filter((row) => !disliked.has(row.video_id));
}

export async function getVideos(category?: string | null): Promise<VideoRow[]> {
  const db = getVideosDb();
  const rows = await db.getAllAsync<VideoRow>(
    `SELECT ${getVideoListColumns()} FROM videos
     WHERE ${HORIZONTAL_WHERE}
     ORDER BY upload_date DESC, updated_at DESC`
  );

  if (!category || category === 'All' || category === 'Todos') {
    return rows;
  }

  return rows.filter((row) => parseCategories(row.categories).includes(category));
}

/** Home feed: Music ranks by local listens; others use day-gap + watched deprioritized. */
export async function getHomeFeed(category?: string | null): Promise<VideoRow[]> {
  const [rows, disliked] = await Promise.all([getVideos(category), dislikedSet()]);
  const visible = withoutDisliked(rows, disliked);
  if (isMusicCategory(category)) {
    const [counts, recentIds] = await Promise.all([
      getHistoryCounts(),
      getRecentHistoryIds(MUSIC_RECENT_COOLDOWN),
    ]);
    return rankMusicFeed(visible, counts, recentIds);
  }
  const watchedIds = await getHistoryIds();
  return rankFeedVideos(visible, watchedIds);
}

export async function getShortVideos(): Promise<VideoRow[]> {
  const db = getVideosDb();
  const rows = await db.getAllAsync<VideoRow>(
    `SELECT ${getVideoListColumns()} FROM videos
     WHERE ${VERTICAL_WHERE}
     ORDER BY upload_date DESC`
  );
  return withoutDisliked(rows, await dislikedSet());
}

export async function getVideoById(videoId: string): Promise<VideoRow | null> {
  const db = getVideosDb();
  return (
    (await db.getFirstAsync<VideoRow>(
      `SELECT ${getVideoListColumns()} FROM videos WHERE video_id = ? LIMIT 1`,
      [videoId]
    )) ?? null
  );
}

export async function searchVideos(query: string): Promise<VideoRow[]> {
  const db = getVideosDb();
  const q = `%${query.trim()}%`;
  if (!query.trim()) return getVideos();

  if (hasVideosGenresColumn()) {
    return db.getAllAsync<VideoRow>(
      `SELECT ${getVideoListColumns()} FROM videos
       WHERE ${HORIZONTAL_WHERE}
         AND (title LIKE ? OR channel LIKE ? OR tags LIKE ? OR description LIKE ? OR genres LIKE ?)
       ORDER BY upload_date DESC`,
      [q, q, q, q, q]
    );
  }

  return db.getAllAsync<VideoRow>(
    `SELECT ${getVideoListColumns()} FROM videos
     WHERE ${HORIZONTAL_WHERE}
       AND (title LIKE ? OR channel LIKE ? OR tags LIKE ? OR description LIKE ?)
     ORDER BY upload_date DESC`,
    [q, q, q, q]
  );
}

export async function getVideosByChannel(channelId: string): Promise<VideoRow[]> {
  const db = getVideosDb();
  return db.getAllAsync<VideoRow>(
    `SELECT ${getVideoListColumns()} FROM videos
     WHERE channel_id = ? AND ${HORIZONTAL_WHERE}
     ORDER BY upload_date DESC`,
    [channelId]
  );
}

/**
 * Rank candidates that share genres with `seed`, most overlap first.
 * @internal Exported for unit tests.
 */
export function rankBySharedGenres(seedGenres: string[], candidates: VideoRow[]): VideoRow[] {
  if (seedGenres.length === 0) return [];
  return candidates
    .map((video) => ({
      video,
      overlap: sharedGenreCount(seedGenres, parseGenres(video.genres)),
    }))
    .filter((row) => row.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .map((row) => row.video);
}

export async function getRelatedVideos(
  video: VideoRow,
  limit = env.relatedVideosLimit
): Promise<VideoRow[]> {
  const db = getVideosDb();
  const categories = parseCategories(video.categories);
  const category = categories[0];
  const music = isMusicCategory(category);
  const [musicCooldownIds, disliked] = await Promise.all([
    music ? getRecentHistoryIds(MUSIC_RECENT_COOLDOWN) : Promise.resolve([] as string[]),
    dislikedSet(),
  ]);
  const musicCooldown = music ? new Set(musicCooldownIds) : null;

  const eligible = (v: VideoRow) =>
    v.video_id !== video.video_id &&
    !disliked.has(v.video_id) &&
    !musicCooldown?.has(v.video_id);

  // Music: prefer same genre(s) for the up-next queue.
  if (music && hasVideosGenresColumn()) {
    const seedGenres = parseGenres(video.genres);
    if (seedGenres.length > 0) {
      const pool = await getVideos(category);
      const candidates = pool.filter(eligible);
      const byGenre = rankBySharedGenres(seedGenres, candidates).slice(0, limit);
      if (byGenre.length > 0) return byGenre;
    }
  }

  if (video.channel_id) {
    const sameChannel = await db.getAllAsync<VideoRow>(
      `SELECT ${getVideoListColumns()} FROM videos
       WHERE channel_id = ? AND video_id != ? AND ${HORIZONTAL_WHERE}
       ORDER BY upload_date DESC
       LIMIT ?`,
      [video.channel_id, video.video_id, Math.max(limit * 4, 30)]
    );
    const filtered = sameChannel.filter(eligible).slice(0, limit);
    if (filtered.length >= 3) return filtered;
  }

  if (category) {
    const all = await getVideos();
    return all
      .filter((v) => eligible(v) && parseCategories(v.categories).includes(category))
      .slice(0, limit);
  }

  const recent = await db.getAllAsync<VideoRow>(
    `SELECT ${getVideoListColumns()} FROM videos
     WHERE video_id != ? AND ${HORIZONTAL_WHERE}
     ORDER BY upload_date DESC
     LIMIT ?`,
    [video.video_id, Math.max(limit * 4, 30)]
  );
  return recent.filter(eligible).slice(0, limit);
}

export async function getAllCategories(): Promise<string[]> {
  const rows = await getVideos();
  const set = new Set<string>();
  for (const row of rows) {
    for (const cat of parseCategories(row.categories)) {
      set.add(cat);
    }
  }
  return ['Todos', ...Array.from(set).sort()];
}

/**
 * Music tab: one representative track per genre, biased toward
 * frequently listened genres and catalog relevance.
 */
export async function getMusicGenreFeed(): Promise<GenreRepresentative[]> {
  const [all, disliked, counts] = await Promise.all([
    getVideos(),
    dislikedSet(),
    getHistoryCounts(),
  ]);
  const music = withoutDisliked(all, disliked).filter((row) =>
    parseCategories(row.categories).some((cat) => isMusicCategory(cat))
  );
  return buildMusicGenreFeed(music, counts);
}
