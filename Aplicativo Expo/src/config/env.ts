function readString(name: string, fallback: string): string {
  const value = process.env[name];
  return value != null && value !== '' ? value : fallback;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Central app config loaded from Expo `EXPO_PUBLIC_*` env vars (.env).
 * Fallbacks keep Jest / local runs working when a key is unset.
 */
export const env = {
  remoteVideosDbUrl: readString('EXPO_PUBLIC_REMOTE_VIDEOS_DB_URL', ''),
  remoteChannelsDbUrl: readString('EXPO_PUBLIC_REMOTE_CHANNELS_DB_URL', ''),
  remoteVideosDbFilename: readString('EXPO_PUBLIC_REMOTE_VIDEOS_DB_FILENAME', 'videos.sqlite'),
  remoteChannelsDbFilename: readString(
    'EXPO_PUBLIC_REMOTE_CHANNELS_DB_FILENAME',
    'channels.sqlite'
  ),

  dbDirName: readString('EXPO_PUBLIC_DB_DIR_NAME', 'sqlite-remote'),
  dbMetaDirName: readString('EXPO_PUBLIC_DB_META_DIR_NAME', 'db-meta'),
  syncStaleMs: readNumber('EXPO_PUBLIC_SYNC_STALE_MS', 60 * 60 * 1000),

  historyStorageKey: readString('EXPO_PUBLIC_HISTORY_STORAGE_KEY', 'hak.watch.history'),
  ratingsStorageKey: readString('EXPO_PUBLIC_RATINGS_STORAGE_KEY', 'hak.video.ratings'),

  maxHistory: readNumber('EXPO_PUBLIC_MAX_HISTORY', 500),
  feedMinDayGap: readNumber('EXPO_PUBLIC_FEED_MIN_DAY_GAP', 3),
  musicRecentCooldown: readNumber('EXPO_PUBLIC_MUSIC_RECENT_COOLDOWN', 10),
  channelNoViewsWeight: readNumber('EXPO_PUBLIC_CHANNEL_NO_VIEWS_WEIGHT', 0.15),
  homeChannelLimit: readNumber('EXPO_PUBLIC_HOME_CHANNEL_LIMIT', 12),
  relatedVideosLimit: readNumber('EXPO_PUBLIC_RELATED_VIDEOS_LIMIT', 10),

  searchDebounceMs: readNumber('EXPO_PUBLIC_SEARCH_DEBOUNCE_MS', 250),

  shortsPreloadAhead: readNumber('EXPO_PUBLIC_SHORTS_PRELOAD_AHEAD', 2),
  shortsPreloadBehind: readNumber('EXPO_PUBLIC_SHORTS_PRELOAD_BEHIND', 1),
  shortsVisiblePct: readNumber('EXPO_PUBLIC_SHORTS_VISIBLE_PCT', 55),
  shortsMinViewMs: readNumber('EXPO_PUBLIC_SHORTS_MIN_VIEW_MS', 80),

  tabBarHeight: readNumber('EXPO_PUBLIC_TAB_BAR_HEIGHT', 49),

  theme: {
    bg: readString('EXPO_PUBLIC_THEME_BG', '#212121'),
    surface: readString('EXPO_PUBLIC_THEME_SURFACE', '#0f0f0f'),
    chip: readString('EXPO_PUBLIC_THEME_CHIP', 'rgba(255,255,255,0.1)'),
    muted: readString('EXPO_PUBLIC_THEME_MUTED', '#aaaaaa'),
    red: readString('EXPO_PUBLIC_THEME_RED', '#FF0000'),
    white: readString('EXPO_PUBLIC_THEME_WHITE', '#ffffff'),
    border: readString('EXPO_PUBLIC_THEME_BORDER', '#303030'),
  },
} as const;
