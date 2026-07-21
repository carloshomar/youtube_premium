import { getChannelsDb, getVideosDb } from './db';
import { rankChannelsWeighted } from './channelRanking';
import type { ChannelRow } from './types';

type ChannelStatsRow = {
  channel_id: string | null;
  channel: string | null;
  video_count: number;
  total_views: number | null;
};

export async function getChannels(): Promise<ChannelRow[]> {
  const channelsDb = getChannelsDb();
  const videosDb = getVideosDb();

  const channels = await channelsDb.getAllAsync<ChannelRow>(
    `SELECT id, channel_url, channel_handle, channel_id, title, enabled,
            limit_videos, last_checked_at, last_error, created_at, updated_at
     FROM channels
     WHERE enabled = 1
     ORDER BY updated_at DESC`
  );

  const names = await videosDb.getAllAsync<ChannelStatsRow>(
    `SELECT channel_id, channel, COUNT(*) as video_count,
            COALESCE(SUM(view_count), 0) as total_views
     FROM videos
     GROUP BY channel_id`
  );

  const nameMap = new Map(
    names.map((n) => [
      n.channel_id,
      {
        display_name: n.channel,
        video_count: n.video_count,
        total_views: Number(n.total_views) || 0,
      },
    ])
  );

  const viewsMap: Record<string, number> = {};
  const enriched = channels.map((ch) => {
    const extra = ch.channel_id ? nameMap.get(ch.channel_id) : undefined;
    if (ch.channel_id) {
      viewsMap[ch.channel_id] = extra?.total_views ?? 0;
    }
    return {
      ...ch,
      display_name: ch.title || extra?.display_name || ch.channel_handle || 'Canal',
      video_count: extra?.video_count ?? 0,
      total_views: extra?.total_views ?? 0,
    };
  });

  return rankChannelsWeighted(enriched, viewsMap);
}

export async function getChannelById(channelId: string): Promise<ChannelRow | null> {
  const channels = await getChannels();
  return channels.find((c) => c.channel_id === channelId) ?? null;
}
