import { makeVideo } from '../helpers/fixtures';

const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockGetHistoryIds = jest.fn();
const mockGetHistoryCounts = jest.fn();
const mockGetRecentHistoryIds = jest.fn();
const mockGetDislikedVideoIds = jest.fn();

jest.mock('../../src/data/db', () => ({
  getVideosDb: () => ({
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
  }),
  getVideoListColumns: () =>
    'video_id, url, title, description, channel, channel_id, uploader, uploader_id, duration_sec, upload_date, view_count, like_count, comment_count, categories, genres, tags, thumbnail, webpage_url, width, height, mp4_sas_url, mp3_sas_url, thumb_sas_url, updated_at',
  hasVideosGenresColumn: () => true,
}));

jest.mock('../../src/data/history', () => ({
  getHistoryIds: (...args: unknown[]) => mockGetHistoryIds(...args),
  getHistoryCounts: (...args: unknown[]) => mockGetHistoryCounts(...args),
  getRecentHistoryIds: (...args: unknown[]) => mockGetRecentHistoryIds(...args),
}));

jest.mock('../../src/data/ratings', () => ({
  getDislikedVideoIds: (...args: unknown[]) => mockGetDislikedVideoIds(...args),
}));

import {
  getAllCategories,
  getHomeFeed,
  getMusicGenreFeed,
  getRelatedVideos,
  getShortVideos,
  getVideoById,
  getVideos,
  getVideosByChannel,
  rankBySharedGenres,
  searchVideos,
} from '../../src/data/videos';

describe('videos repository', () => {
  beforeEach(() => {
    mockGetAllAsync.mockReset();
    mockGetFirstAsync.mockReset();
    mockGetHistoryIds.mockReset().mockResolvedValue([]);
    mockGetHistoryCounts.mockReset().mockResolvedValue({});
    mockGetRecentHistoryIds.mockReset().mockResolvedValue([]);
    mockGetDislikedVideoIds.mockReset().mockResolvedValue([]);
  });

  it('getHomeFeed ranks videos and deprioritizes watched ids', async () => {
    const rows = [
      makeVideo({ video_id: 'seen', upload_date: '20260715', view_count: 9999 }),
      makeVideo({ video_id: 'fresh', upload_date: '20260601', view_count: 10 }),
    ];
    mockGetAllAsync.mockResolvedValue(rows);
    mockGetHistoryIds.mockResolvedValue(['seen']);

    const feed = await getHomeFeed();
    expect(feed[0].video_id).toBe('fresh');
    expect(feed[feed.length - 1].video_id).toBe('seen');
    expect(mockGetHistoryIds).toHaveBeenCalled();
  });

  it('getHomeFeed Music ranks by local play counts', async () => {
    const rows = [
      makeVideo({ video_id: 'rare', categories: '["Music"]', upload_date: '20260715', view_count: 9999 }),
      makeVideo({ video_id: 'hit', categories: '["Music"]', upload_date: '20260101', view_count: 1 }),
    ];
    mockGetAllAsync.mockResolvedValue(rows);
    mockGetHistoryCounts.mockResolvedValue({ hit: 4, rare: 1 });

    const feed = await getHomeFeed('Music');
    expect(feed.map((v) => v.video_id)).toEqual(['hit', 'rare']);
    expect(mockGetHistoryCounts).toHaveBeenCalled();
    expect(mockGetRecentHistoryIds).toHaveBeenCalledWith(10);
    expect(mockGetHistoryIds).not.toHaveBeenCalled();
  });

  it('getHomeFeed Music deprioritizes the last 10 recent plays', async () => {
    const rows = [
      makeVideo({ video_id: 'just-played', categories: '["Music"]', upload_date: '20260101', view_count: 1 }),
      makeVideo({ video_id: 'other', categories: '["Music"]', upload_date: '20260601', view_count: 50 }),
    ];
    mockGetAllAsync.mockResolvedValue(rows);
    mockGetHistoryCounts.mockResolvedValue({ 'just-played': 9, other: 1 });
    mockGetRecentHistoryIds.mockResolvedValue(['just-played']);

    const feed = await getHomeFeed('Music');
    expect(feed.map((v) => v.video_id)).toEqual(['other', 'just-played']);
  });

  it('getVideos queries horizontal videos only', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getVideos();
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('height <= width')
    );
  });

  it('getVideos returns all rows for Todos/All/empty', async () => {
    const rows = [makeVideo(), makeVideo({ video_id: '2', categories: '["Music"]' })];
    mockGetAllAsync.mockResolvedValue(rows);

    await expect(getVideos()).resolves.toEqual(rows);
    await expect(getVideos('Todos')).resolves.toEqual(rows);
    await expect(getVideos('All')).resolves.toEqual(rows);
  });

  it('getVideos filters by category using parseCategories', async () => {
    const rows = [
      makeVideo({ video_id: '1', categories: '["Education"]' }),
      makeVideo({ video_id: '2', categories: '["Music"]' }),
    ];
    mockGetAllAsync.mockResolvedValue(rows);

    await expect(getVideos('Music')).resolves.toEqual([rows[1]]);
  });

  it('getShortVideos queries vertical videos (height > width)', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getShortVideos();
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('height > width')
    );
  });

  it('getVideoById returns row or null', async () => {
    const row = makeVideo();
    mockGetFirstAsync.mockResolvedValueOnce(row);
    await expect(getVideoById('vid-1')).resolves.toEqual(row);

    mockGetFirstAsync.mockResolvedValueOnce(null);
    await expect(getVideoById('missing')).resolves.toBeNull();
  });

  it('searchVideos falls back to getVideos on blank query', async () => {
    const rows = [makeVideo()];
    mockGetAllAsync.mockResolvedValue(rows);
    await expect(searchVideos('   ')).resolves.toEqual(rows);
  });

  it('searchVideos uses LIKE params and horizontal filter', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await searchVideos('IA');
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/height <= width[\s\S]*LIKE \?/),
      ['%IA%', '%IA%', '%IA%', '%IA%', '%IA%']
    );
  });

  it('getVideosByChannel filters by channel_id and horizontal', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getVideosByChannel('UC_TEST');
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/channel_id = \?[\s\S]*height <= width/),
      ['UC_TEST']
    );
  });

  it('getRelatedVideos prefers same channel when enough results', async () => {
    const current = makeVideo({ video_id: 'current', channel_id: 'UC_A' });
    const related = [
      makeVideo({ video_id: 'a' }),
      makeVideo({ video_id: 'b' }),
      makeVideo({ video_id: 'c' }),
    ];
    mockGetAllAsync.mockResolvedValueOnce(related);

    await expect(getRelatedVideos(current)).resolves.toEqual(related);
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('channel_id = ? AND video_id != ?'),
      ['UC_A', 'current', 40]
    );
  });

  it('getRelatedVideos falls back to same category when channel has few results', async () => {
    const current = makeVideo({
      video_id: 'current',
      channel_id: 'UC_A',
      categories: '["Education"]',
    });
    const sameChannelFew = [makeVideo({ video_id: 'only-one' })];
    const all = [
      current,
      makeVideo({ video_id: 'edu-2', categories: '["Education"]' }),
      makeVideo({ video_id: 'music', categories: '["Music"]' }),
    ];

    mockGetAllAsync
      .mockResolvedValueOnce(sameChannelFew)
      .mockResolvedValueOnce(all);

    const result = await getRelatedVideos(current, 5);
    expect(result.map((v) => v.video_id)).toEqual(['edu-2']);
  });

  it('getRelatedVideos for Music skips the last 10 recent plays', async () => {
    const current = makeVideo({
      video_id: 'current',
      channel_id: 'UC_A',
      categories: '["Music"]',
    });
    mockGetRecentHistoryIds.mockResolvedValue(['recent-a']);
    mockGetAllAsync.mockResolvedValueOnce([
      makeVideo({ video_id: 'recent-a', categories: '["Music"]' }),
      makeVideo({ video_id: 'ok-1', categories: '["Music"]' }),
      makeVideo({ video_id: 'ok-2', categories: '["Music"]' }),
      makeVideo({ video_id: 'ok-3', categories: '["Music"]' }),
    ]);

    const result = await getRelatedVideos(current);
    expect(result.map((v) => v.video_id)).toEqual(['ok-1', 'ok-2', 'ok-3']);
    expect(mockGetRecentHistoryIds).toHaveBeenCalledWith(10);
  });

  it('getRelatedVideos for Music prefers shared genres over same channel', async () => {
    const current = makeVideo({
      video_id: 'soudiere',
      channel_id: 'UC_PHONK',
      categories: '["Music"]',
      genres: 'phonk, trap, lo-fi',
    });
    mockGetAllAsync.mockResolvedValueOnce([
      current,
      makeVideo({
        video_id: 'phonk-2',
        categories: '["Music"]',
        genres: 'phonk',
        channel_id: 'UC_OTHER',
      }),
      makeVideo({
        video_id: 'phonk-trap',
        categories: '["Music"]',
        genres: 'phonk, trap',
        channel_id: 'UC_OTHER',
      }),
      makeVideo({
        video_id: 'ana',
        categories: '["Music"]',
        genres: 'sertanejo',
        channel_id: 'UC_OTHER',
      }),
      makeVideo({
        video_id: 'same-channel-rock',
        categories: '["Music"]',
        genres: 'rock',
        channel_id: 'UC_PHONK',
      }),
    ]);

    const result = await getRelatedVideos(current);
    expect(result.map((v) => v.video_id)).toEqual(['phonk-trap', 'phonk-2']);
  });

  it('getRelatedVideos for Music with genres still skips recent cooldown', async () => {
    const current = makeVideo({
      video_id: 'livinho',
      categories: '["Music"]',
      genres: 'funk',
    });
    mockGetRecentHistoryIds.mockResolvedValue(['funk-recent']);
    mockGetAllAsync.mockResolvedValueOnce([
      current,
      makeVideo({ video_id: 'funk-recent', categories: '["Music"]', genres: 'funk' }),
      makeVideo({ video_id: 'funk-ok', categories: '["Music"]', genres: 'funk' }),
    ]);

    const result = await getRelatedVideos(current);
    expect(result.map((v) => v.video_id)).toEqual(['funk-ok']);
  });

  it('getRelatedVideos excludes disliked videos', async () => {
    const current = makeVideo({
      video_id: 'current',
      channel_id: 'UC_A',
      categories: '["Music"]',
      genres: 'funk',
    });
    mockGetDislikedVideoIds.mockResolvedValue(['funk-bad']);
    mockGetAllAsync.mockResolvedValueOnce([
      current,
      makeVideo({ video_id: 'funk-bad', categories: '["Music"]', genres: 'funk' }),
      makeVideo({ video_id: 'funk-ok', categories: '["Music"]', genres: 'funk' }),
    ]);

    const result = await getRelatedVideos(current);
    expect(result.map((v) => v.video_id)).toEqual(['funk-ok']);
  });

  it('getHomeFeed excludes disliked videos', async () => {
    const rows = [
      makeVideo({ video_id: 'ok', upload_date: '20260601', view_count: 10 }),
      makeVideo({ video_id: 'bad', upload_date: '20260715', view_count: 9999 }),
    ];
    mockGetAllAsync.mockResolvedValue(rows);
    mockGetDislikedVideoIds.mockResolvedValue(['bad']);
    mockGetHistoryIds.mockResolvedValue([]);

    const feed = await getHomeFeed();
    expect(feed.map((v) => v.video_id)).toEqual(['ok']);
  });

  it('getMusicGenreFeed returns one track per genre from Music only', async () => {
    mockGetAllAsync.mockResolvedValue([
      makeVideo({
        video_id: 'edu',
        categories: '["Education"]',
        genres: 'lecture',
      }),
      makeVideo({
        video_id: 'funk-1',
        categories: '["Music"]',
        genres: 'funk',
      }),
      makeVideo({
        video_id: 'phonk-1',
        categories: '["Music"]',
        genres: 'phonk',
      }),
    ]);
    mockGetHistoryCounts.mockResolvedValue({ 'funk-1': 3 });

    const feed = await getMusicGenreFeed();
    expect(feed.map((item) => item.genreKey).sort()).toEqual(['funk', 'phonk']);
    expect(feed.every((item) => item.video.categories?.includes('Music'))).toBe(true);
  });

  it('rankBySharedGenres orders by overlap count', () => {
    const ranked = rankBySharedGenres(
      ['phonk', 'trap'],
      [
        makeVideo({ video_id: 'one', genres: 'phonk' }),
        makeVideo({ video_id: 'two', genres: 'phonk, trap' }),
        makeVideo({ video_id: 'none', genres: 'sertanejo' }),
      ]
    );
    expect(ranked.map((v) => v.video_id)).toEqual(['two', 'one']);
  });

  it('getRelatedVideos falls back to recent videos when no category', async () => {
    const current = makeVideo({
      video_id: 'current',
      channel_id: null,
      categories: null,
    });
    mockGetAllAsync.mockResolvedValue([makeVideo({ video_id: 'other' })]);

    await getRelatedVideos(current, 3);
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('video_id != ?'),
      ['current', 30]
    );
  });

  it('getAllCategories prefixes Todos and sorts unique categories', async () => {
    mockGetAllAsync.mockResolvedValue([
      makeVideo({ categories: '["Music"]' }),
      makeVideo({ categories: '["Education"]' }),
      makeVideo({ categories: '["Music"]' }),
    ]);

    await expect(getAllCategories()).resolves.toEqual(['Todos', 'Education', 'Music']);
  });
});
