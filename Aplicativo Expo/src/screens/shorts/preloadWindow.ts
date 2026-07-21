import { env } from '../../config/env';

/** How many shorts to buffer ahead of the active item. */
export const SHORTS_PRELOAD_AHEAD = env.shortsPreloadAhead;
/** How many shorts to keep buffered behind for quick back-swipe. */
export const SHORTS_PRELOAD_BEHIND = env.shortsPreloadBehind;

/**
 * Whether a FlatList index should mount an expo-video player and start buffering.
 * Based on Mux / Expo Shorts feed guidance: tight preload window, null/unmounted outside.
 */
export function shouldPreloadShortIndex(index: number, activeIndex: number): boolean {
  if (activeIndex < 0) return index === 0;
  const delta = index - activeIndex;
  if (delta === 0) return true;
  if (delta > 0) return delta <= SHORTS_PRELOAD_AHEAD;
  return -delta <= SHORTS_PRELOAD_BEHIND;
}
