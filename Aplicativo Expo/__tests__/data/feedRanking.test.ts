import {
  FEED_MIN_DAY_GAP,
  isMusicCategory,
  parseUploadDateMs,
  rankFeedVideos,
  rankMusicFeed,
  relevanceScore,
  shuffleWithDayGap,
  uploadDayDiff,
} from '../../src/data/feedRanking';
import { makeVideo } from '../helpers/fixtures';

/** Always pick the first eligible candidate (highest relevance). */
const pickFirst = () => 0;

describe('feedRanking', () => {
  it('parses YYYYMMDD upload dates', () => {
    expect(parseUploadDateMs('20260701')).toBe(Date.UTC(2026, 6, 1));
    expect(parseUploadDateMs(null)).toBeNull();
    expect(parseUploadDateMs('2026')).toBeNull();
  });

  it('computes absolute day gaps', () => {
    expect(uploadDayDiff('20260710', '20260701')).toBe(9);
    expect(uploadDayDiff('20260701', null)).toBe(0);
  });

  it('scores newer / higher-view videos higher', () => {
    const newer = makeVideo({ video_id: 'n', upload_date: '20260710', view_count: 100 });
    const older = makeVideo({ video_id: 'o', upload_date: '20260101', view_count: 100 });
    const viralOld = makeVideo({ video_id: 'v', upload_date: '20260101', view_count: 5_000_000 });
    expect(relevanceScore(newer)).toBeGreaterThan(relevanceScore(older));
    expect(relevanceScore(viralOld)).toBeGreaterThan(relevanceScore(older));
  });

  it('keeps min day gap between consecutive items when possible', () => {
    const videos = [
      makeVideo({ video_id: 'd1', upload_date: '20260710', view_count: 300 }),
      makeVideo({ video_id: 'd2', upload_date: '20260709', view_count: 290 }),
      makeVideo({ video_id: 'd3', upload_date: '20260708', view_count: 280 }),
      makeVideo({ video_id: 'w1', upload_date: '20260601', view_count: 200 }),
      makeVideo({ video_id: 'w2', upload_date: '20260501', view_count: 150 }),
      makeVideo({ video_id: 'w3', upload_date: '20260401', view_count: 100 }),
    ];

    const ranked = shuffleWithDayGap(videos, FEED_MIN_DAY_GAP, pickFirst);

    for (let i = 1; i < ranked.length; i += 1) {
      const gap = uploadDayDiff(ranked[i].upload_date, ranked[i - 1].upload_date);
      // With spaced dates available, greedy pickFirst should always satisfy the gap.
      expect(gap).toBeGreaterThanOrEqual(FEED_MIN_DAY_GAP);
    }
  });

  it('puts watched videos after unwatched ones', () => {
    const videos = [
      makeVideo({ video_id: 'seen-new', upload_date: '20260715', view_count: 9999 }),
      makeVideo({ video_id: 'fresh-old', upload_date: '20260101', view_count: 10 }),
      makeVideo({ video_id: 'fresh-new', upload_date: '20260710', view_count: 100 }),
    ];

    const ranked = rankFeedVideos(videos, ['seen-new'], { random: pickFirst });
    expect(ranked.map((v) => v.video_id)).toEqual(['fresh-new', 'fresh-old', 'seen-new']);
  });

  it('still returns all videos when everything was watched', () => {
    const videos = [
      makeVideo({ video_id: 'a', upload_date: '20260710' }),
      makeVideo({ video_id: 'b', upload_date: '20260601' }),
    ];
    const ranked = rankFeedVideos(videos, ['a', 'b'], { random: pickFirst });
    expect(ranked).toHaveLength(2);
    expect(ranked.map((v) => v.video_id).sort()).toEqual(['a', 'b']);
  });

  it('relaxes day gap when no eligible candidate remains', () => {
    const sameWeek = [
      makeVideo({ video_id: 'a', upload_date: '20260710', view_count: 3 }),
      makeVideo({ video_id: 'b', upload_date: '20260709', view_count: 2 }),
      makeVideo({ video_id: 'c', upload_date: '20260708', view_count: 1 }),
    ];
    const ranked = shuffleWithDayGap(sameWeek, 30, pickFirst);
    expect(ranked).toHaveLength(3);
    expect(new Set(ranked.map((v) => v.video_id)).size).toBe(3);
  });

  it('handles invalid upload dates and empty pools', () => {
    expect(parseUploadDateMs('00000000')).toBeNull();
    expect(parseUploadDateMs('20260001')).toBeNull();
    expect(parseUploadDateMs('20260700')).toBeNull();
    expect(parseUploadDateMs('abcdefgh')).toBeNull();
    expect(relevanceScore(makeVideo({ upload_date: null, view_count: null }))).toBeDefined();
    expect(shuffleWithDayGap([], 3, pickFirst)).toEqual([]);
    expect(shuffleWithDayGap([makeVideo({ video_id: 'only' })], 3, pickFirst)).toHaveLength(1);
  });

  it('weightedIndex covers empty, zero-total, mid and last picks', () => {
    const { __weightedIndexForTests: weightedIndex } = require('../../src/data/feedRanking');
    expect(weightedIndex([], () => 0.5)).toBe(0);
    expect(weightedIndex([0, 0], () => 0.5)).toBe(0);
    expect(weightedIndex([1, 2, 3], () => 0)).toBe(0);
    expect(weightedIndex([1, 2, 3], () => 0.5)).toBe(1);
    expect(weightedIndex([1, 2, 3], () => 0.999)).toBe(2);
  });

  it('uses default minDayGap and Math.random when options omitted', () => {
    const videos = [
      makeVideo({ video_id: 'a', upload_date: '20260710' }),
      makeVideo({ video_id: 'b', upload_date: '20260101' }),
    ];
    const ranked = rankFeedVideos(videos, []);
    expect(ranked).toHaveLength(2);
  });

  it('detects Music category names case-insensitively', () => {
    expect(isMusicCategory('Music')).toBe(true);
    expect(isMusicCategory('música')).toBe(true);
    expect(isMusicCategory('Musica')).toBe(true);
    expect(isMusicCategory('Education')).toBe(false);
    expect(isMusicCategory(null)).toBe(false);
  });

  it('rankMusicFeed sorts by local play counts then relevance', () => {
    const videos = [
      makeVideo({ video_id: 'low', upload_date: '20260715', view_count: 9999 }),
      makeVideo({ video_id: 'high', upload_date: '20260101', view_count: 1 }),
      makeVideo({ video_id: 'mid', upload_date: '20260601', view_count: 100 }),
      makeVideo({ video_id: 'untouched', upload_date: '20260710', view_count: 500 }),
    ];
    const ranked = rankMusicFeed(videos, { high: 5, mid: 2, low: 1 });
    expect(ranked.map((v) => v.video_id)).toEqual(['high', 'mid', 'low', 'untouched']);
  });

  it('rankMusicFeed pushes recent plays to the end', () => {
    const videos = [
      makeVideo({ video_id: 'hot', upload_date: '20260101', view_count: 1 }),
      makeVideo({ video_id: 'recent', upload_date: '20260101', view_count: 1 }),
      makeVideo({ video_id: 'other', upload_date: '20260601', view_count: 50 }),
    ];
    const ranked = rankMusicFeed(videos, { hot: 10, recent: 9, other: 1 }, ['recent']);
    expect(ranked.map((v) => v.video_id)).toEqual(['hot', 'other', 'recent']);
  });
});
