import {
  CHANNEL_NO_VIEWS_WEIGHT,
  channelRecommendationWeight,
  rankChannelsWeighted,
} from '../../src/data/channelRanking';
import type { ChannelRow } from '../../src/data/types';

function ch(partial: Partial<ChannelRow> & { id: number; channel_id: string | null }): ChannelRow {
  return {
    channel_url: 'u',
    channel_handle: '@x',
    title: null,
    enabled: 1,
    limit_videos: 5,
    last_checked_at: null,
    last_error: null,
    created_at: 't',
    updated_at: 't',
    display_name: partial.display_name ?? partial.channel_id ?? 'Canal',
    video_count: partial.video_count ?? 0,
    total_views: partial.total_views ?? 0,
    ...partial,
  };
}

describe('channelRanking', () => {
  it('weights viewed channels higher than zero-view ones', () => {
    expect(channelRecommendationWeight(0)).toBe(CHANNEL_NO_VIEWS_WEIGHT);
    expect(channelRecommendationWeight(100)).toBeGreaterThan(CHANNEL_NO_VIEWS_WEIGHT);
    expect(channelRecommendationWeight(1_000_000)).toBeGreaterThan(
      channelRecommendationWeight(100)
    );
  });

  it('still includes zero-view channels while preferring high-view ones', () => {
    const channels = [
      ch({ id: 1, channel_id: 'zero', display_name: 'Zero' }),
      ch({ id: 2, channel_id: 'hot', display_name: 'Hot' }),
      ch({ id: 3, channel_id: 'warm', display_name: 'Warm' }),
    ];
    const views = { hot: 50_000, warm: 10, zero: 0 };

    // Always pick the highest remaining weight first.
    const pickFirst = () => 0;
    const ranked = rankChannelsWeighted(channels, views, pickFirst);
    expect(ranked.map((c) => c.channel_id)).toEqual(['hot', 'warm', 'zero']);
  });

  it('returns a shallow copy for empty or single-item lists', () => {
    expect(rankChannelsWeighted([], {})).toEqual([]);
    const only = [ch({ id: 1, channel_id: 'only' })];
    expect(rankChannelsWeighted(only, { only: 0 })).toEqual(only);
    expect(rankChannelsWeighted(only, { only: 0 })).not.toBe(only);
  });
});
