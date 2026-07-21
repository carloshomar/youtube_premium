import { isVerticalVideo } from '../../src/data/videoOrientation';

describe('isVerticalVideo', () => {
  it('returns true when height > width', () => {
    expect(isVerticalVideo({ width: 1080, height: 1920 })).toBe(true);
  });

  it('returns false for horizontal and square', () => {
    expect(isVerticalVideo({ width: 1920, height: 1080 })).toBe(false);
    expect(isVerticalVideo({ width: 1080, height: 1080 })).toBe(false);
  });

  it('returns false when dimensions are missing', () => {
    expect(isVerticalVideo({ width: null, height: 1920 })).toBe(false);
    expect(isVerticalVideo({ width: 1080, height: null })).toBe(false);
    expect(isVerticalVideo({ width: null, height: null })).toBe(false);
  });
});
