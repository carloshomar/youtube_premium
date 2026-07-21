import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addToHistory,
  clearHistory,
  getHistoryCounts,
  getHistoryIds,
  getRecentHistoryIds,
  normalizeHistoryStore,
} from '../../src/data/history';

describe('watch history', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts empty', async () => {
    await expect(getHistoryIds()).resolves.toEqual([]);
    await expect(getHistoryCounts()).resolves.toEqual({});
  });

  it('adds newest first, dedupes, and increments play counts', async () => {
    await addToHistory('a');
    await addToHistory('b');
    await addToHistory('a');
    await expect(getHistoryIds()).resolves.toEqual(['a', 'b']);
    await expect(getHistoryCounts()).resolves.toEqual({ a: 2, b: 1 });
  });

  it('getRecentHistoryIds returns the MRU slice', async () => {
    await addToHistory('a');
    await addToHistory('b');
    await addToHistory('c');
    await expect(getRecentHistoryIds(2)).resolves.toEqual(['c', 'b']);
    await expect(getRecentHistoryIds(10)).resolves.toEqual(['c', 'b', 'a']);
  });

  it('caps history at MAX_HISTORY items', async () => {
    const { MAX_HISTORY } = require('../../src/data/history');
    for (let i = 0; i < MAX_HISTORY + 5; i += 1) {
      await addToHistory(`v${i}`);
    }
    const ids = await getHistoryIds();
    expect(ids).toHaveLength(MAX_HISTORY);
    expect(ids[0]).toBe(`v${MAX_HISTORY + 4}`);
    expect(ids).not.toContain('v0');
    const counts = await getHistoryCounts();
    expect(counts.v0).toBeUndefined();
    expect(counts[`v${MAX_HISTORY + 4}`]).toBe(1);
  });

  it('clearHistory removes storage key', async () => {
    await addToHistory('x');
    await clearHistory();
    await expect(getHistoryIds()).resolves.toEqual([]);
    await expect(getHistoryCounts()).resolves.toEqual({});
  });

  it('returns [] when stored JSON is invalid', async () => {
    await AsyncStorage.setItem('hak.watch.history', '{not-json');
    await expect(getHistoryIds()).resolves.toEqual([]);
  });

  it('returns [] when stored value is neither array nor v1 store', async () => {
    await AsyncStorage.setItem('hak.watch.history', '{"a":1}');
    await expect(getHistoryIds()).resolves.toEqual([]);
  });

  it('migrates legacy string[] into counts of 1', async () => {
    await AsyncStorage.setItem('hak.watch.history', JSON.stringify(['x', 'y']));
    await expect(getHistoryIds()).resolves.toEqual(['x', 'y']);
    await expect(getHistoryCounts()).resolves.toEqual({ x: 1, y: 1 });
    await addToHistory('x');
    await expect(getHistoryCounts()).resolves.toEqual({ x: 2, y: 1 });
  });

  it('normalizeHistoryStore covers v1 object and empty fallback', () => {
    expect(normalizeHistoryStore({ version: 1, order: ['a'], counts: { a: 3 } })).toEqual({
      version: 1,
      order: ['a'],
      counts: { a: 3 },
    });
    expect(normalizeHistoryStore({ version: 1, order: ['a'], counts: { a: 'bad' } }).counts.a).toBe(
      1
    );
    expect(normalizeHistoryStore(null)).toEqual({ version: 1, order: [], counts: {} });
  });
});
