import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearRatings,
  getDislikedVideoIds,
  getVideoRating,
  normalizeRatingsStore,
  setVideoRating,
} from '../../src/data/ratings';

describe('video ratings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts empty', async () => {
    await expect(getVideoRating('a')).resolves.toBeNull();
    await expect(getDislikedVideoIds()).resolves.toEqual([]);
  });

  it('sets like and dislike mutually exclusively', async () => {
    await expect(setVideoRating('a', 'like')).resolves.toBe('like');
    await expect(getVideoRating('a')).resolves.toBe('like');

    await expect(setVideoRating('a', 'dislike')).resolves.toBe('dislike');
    await expect(getVideoRating('a')).resolves.toBe('dislike');
    await expect(getDislikedVideoIds()).resolves.toEqual(['a']);
  });

  it('toggles off when the same rating is pressed again', async () => {
    await setVideoRating('a', 'dislike');
    await expect(setVideoRating('a', 'dislike')).resolves.toBeNull();
    await expect(getVideoRating('a')).resolves.toBeNull();
    await expect(getDislikedVideoIds()).resolves.toEqual([]);
  });

  it('clearRatings removes storage', async () => {
    await setVideoRating('a', 'like');
    await clearRatings();
    await expect(getVideoRating('a')).resolves.toBeNull();
  });

  it('normalizeRatingsStore ignores invalid entries', () => {
    expect(
      normalizeRatingsStore({
        version: 1,
        ratings: { a: 'like', b: 'nope', c: 'dislike' },
      })
    ).toEqual({ version: 1, ratings: { a: 'like', c: 'dislike' } });
    expect(normalizeRatingsStore(null)).toEqual({ version: 1, ratings: {} });
  });
});
