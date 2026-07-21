export type VideoRow = {
  video_id: string;
  url: string | null;
  title: string | null;
  description: string | null;
  channel: string | null;
  channel_id: string | null;
  uploader: string | null;
  uploader_id: string | null;
  duration_sec: number | null;
  upload_date: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  categories: string | null;
  /** Comma-separated music genres, e.g. `phonk, trap, lo-fi`. */
  genres: string | null;
  tags: string | null;
  thumbnail: string | null;
  webpage_url: string | null;
  width: number | null;
  height: number | null;
  mp4_sas_url: string | null;
  mp3_sas_url: string | null;
  thumb_sas_url: string | null;
  updated_at: string | null;
};

export type ChannelRow = {
  id: number;
  channel_url: string;
  channel_handle: string | null;
  channel_id: string | null;
  title: string | null;
  enabled: number;
  limit_videos: number;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  /** Enriched from videos table when available */
  display_name?: string | null;
  video_count?: number;
  /** Sum of view_count across the channel's videos in the catalog */
  total_views?: number;
};

export const VIDEO_LIST_COLUMNS_WITHOUT_GENRES = `
  video_id, url, title, description, channel, channel_id, uploader, uploader_id,
  duration_sec, upload_date, view_count, like_count, comment_count, categories, tags,
  thumbnail, webpage_url, width, height, mp4_sas_url, mp3_sas_url, thumb_sas_url, updated_at
`.replace(/\s+/g, ' ').trim();

/** Preferred column list when `genres` exists in videos.sqlite. */
export const VIDEO_LIST_COLUMNS = `
  video_id, url, title, description, channel, channel_id, uploader, uploader_id,
  duration_sec, upload_date, view_count, like_count, comment_count, categories, genres, tags,
  thumbnail, webpage_url, width, height, mp4_sas_url, mp3_sas_url, thumb_sas_url, updated_at
`.replace(/\s+/g, ' ').trim();

export function videoListColumns(hasGenresColumn: boolean): string {
  return hasGenresColumn ? VIDEO_LIST_COLUMNS : VIDEO_LIST_COLUMNS_WITHOUT_GENRES;
}
