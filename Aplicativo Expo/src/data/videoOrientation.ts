import type { VideoRow } from '../data/types';

/** Vertical = Shorts; missing dimensions count as horizontal (regular video). */
export function isVerticalVideo(
  video: Pick<VideoRow, 'width' | 'height'> | { width: number | null; height: number | null }
): boolean {
  const { width, height } = video;
  if (width == null || height == null) return false;
  return height > width;
}
