import { env } from '../config/env';
import type { ChannelRow } from './types';

/** Weight floor for channels with zero catalog views — still recommended, less often. */
export const CHANNEL_NO_VIEWS_WEIGHT = env.channelNoViewsWeight;

export type ChannelViewsMap = Record<string, number>;

export function channelRecommendationWeight(totalViews: number): number {
  if (totalViews > 0) {
    return 1 + Math.log1p(totalViews);
  }
  return CHANNEL_NO_VIEWS_WEIGHT;
}

function weightedIndex(weights: number[], random: () => number): number {
  if (weights.length === 0) return 0;
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return 0;
  let ticket = random() * total;
  for (let i = 0; i < weights.length - 1; i += 1) {
    ticket -= weights[i];
    if (ticket <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * Weighted shuffle: channels with catalog views appear more often,
 * but zero-view channels still enter the list.
 */
export function rankChannelsWeighted(
  channels: ChannelRow[],
  viewsMap: ChannelViewsMap,
  random: () => number = Math.random
): ChannelRow[] {
  if (channels.length <= 1) return [...channels];

  const remaining = [...channels];
  const result: ChannelRow[] = [];

  while (remaining.length > 0) {
    remaining.sort((a, b) => {
      const aw = channelRecommendationWeight(
        a.channel_id ? (viewsMap[a.channel_id] ?? 0) : 0
      );
      const bw = channelRecommendationWeight(
        b.channel_id ? (viewsMap[b.channel_id] ?? 0) : 0
      );
      if (bw !== aw) return bw - aw;
      const ac = a.video_count ?? 0;
      const bc = b.video_count ?? 0;
      if (bc !== ac) return bc - ac;
      const an = a.display_name || a.channel_handle || '';
      const bn = b.display_name || b.channel_handle || '';
      return an.localeCompare(bn);
    });

    const weights = remaining.map((ch) => {
      const id = ch.channel_id ?? '';
      const views = id ? (viewsMap[id] ?? 0) : 0;
      return channelRecommendationWeight(views);
    });
    const pickIndex = weightedIndex(weights, random);
    const [picked] = remaining.splice(pickIndex, 1);
    result.push(picked);
  }

  return result;
}
