import { makeVideo } from '../helpers/fixtures';
import {
  buildMusicGenreFeed,
  genreListWeight,
  trackPickWeight,
} from '../../src/data/musicGenres';

describe('musicGenres', () => {
  it('picks one representative per genre', () => {
    const videos = [
      makeVideo({
        video_id: 'phonk-a',
        categories: '["Music"]',
        genres: 'phonk, trap',
        upload_date: '20260101',
        view_count: 10,
      }),
      makeVideo({
        video_id: 'phonk-b',
        categories: '["Music"]',
        genres: 'phonk',
        upload_date: '20260701',
        view_count: 100,
      }),
      makeVideo({
        video_id: 'sertanejo-a',
        categories: '["Music"]',
        genres: 'sertanejo',
        upload_date: '20260601',
        view_count: 50,
      }),
    ];

    const feed = buildMusicGenreFeed(videos, { 'phonk-a': 5, 'phonk-b': 1, 'sertanejo-a': 2 }, () => 0);
    const keys = feed.map((item) => item.genreKey).sort();
    expect(keys).toEqual(['phonk', 'sertanejo', 'trap']);
    expect(new Set(feed.map((item) => item.genreKey)).size).toBe(feed.length);
  });

  it('biases higher listen genres toward the top', () => {
    const videos = [
      makeVideo({
        video_id: 'funk-1',
        categories: '["Music"]',
        genres: 'funk',
        upload_date: '20260101',
        view_count: 1,
      }),
      makeVideo({
        video_id: 'mpb-1',
        categories: '["Music"]',
        genres: 'mpb',
        upload_date: '20260701',
        view_count: 9999,
      }),
    ];

    // Always pick first eligible weight slot → highest weight wins first.
    const feed = buildMusicGenreFeed(videos, { 'funk-1': 20, 'mpb-1': 0 }, () => 0);
    expect(feed[0].genreKey).toBe('funk');
    expect(feed[0].listenScore).toBe(20);
  });

  it('groups videos without genres under outros', () => {
    const videos = [
      makeVideo({
        video_id: 'no-genre',
        categories: '["Music"]',
        genres: null,
        upload_date: '20260601',
      }),
    ];
    const feed = buildMusicGenreFeed(videos, {}, () => 0);
    expect(feed).toHaveLength(1);
    expect(feed[0].genreKey).toBe('outros');
    expect(feed[0].genreLabel).toBe('Outros');
  });

  it('genreListWeight grows with listens', () => {
    expect(genreListWeight(10, 0)).toBeGreaterThan(genreListWeight(0, 0));
    expect(trackPickWeight(5, 100)).toBeGreaterThan(trackPickWeight(0, 100));
  });
});
