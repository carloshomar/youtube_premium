import {
  SHORTS_PRELOAD_AHEAD,
  SHORTS_PRELOAD_BEHIND,
  shouldPreloadShortIndex,
} from '../../src/screens/shorts/preloadWindow';

describe('shouldPreloadShortIndex', () => {
  it('preloads the first item before an active index exists', () => {
    expect(shouldPreloadShortIndex(0, -1)).toBe(true);
    expect(shouldPreloadShortIndex(1, -1)).toBe(false);
  });

  it('always preloads the active index', () => {
    expect(shouldPreloadShortIndex(3, 3)).toBe(true);
  });

  it(`preloads up to ${SHORTS_PRELOAD_AHEAD} items ahead`, () => {
    expect(shouldPreloadShortIndex(4, 3)).toBe(true);
    expect(shouldPreloadShortIndex(3 + SHORTS_PRELOAD_AHEAD, 3)).toBe(true);
    expect(shouldPreloadShortIndex(3 + SHORTS_PRELOAD_AHEAD + 1, 3)).toBe(false);
  });

  it(`preloads up to ${SHORTS_PRELOAD_BEHIND} items behind`, () => {
    expect(shouldPreloadShortIndex(2, 3)).toBe(true);
    expect(shouldPreloadShortIndex(3 - SHORTS_PRELOAD_BEHIND, 3)).toBe(true);
    expect(shouldPreloadShortIndex(3 - SHORTS_PRELOAD_BEHIND - 1, 3)).toBe(false);
  });
});
