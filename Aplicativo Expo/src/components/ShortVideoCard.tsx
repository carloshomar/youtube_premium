import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import * as Icon from 'react-native-feather';
import type { VideoRow } from '../data/types';
import { formatViews } from '../utils/format';

type Props = {
  item: VideoRow;
  onPress: (video: VideoRow) => void;
};

export default function ShortVideoCard({ item, onPress }: Props) {
  const thumb = item.thumb_sas_url || item.thumbnail || undefined;

  return (
    <Pressable
      testID={`short-card-${item.video_id}`}
      onPress={() => onPress(item)}
      className="relative mr-3 h-64 w-40 overflow-hidden rounded-xl bg-neutral-800"
    >
      {thumb ? (
        <Image source={{ uri: thumb }} className="absolute h-full w-full" resizeMode="cover" />
      ) : null}
      <View className="absolute inset-0 bg-black/25" />
      <View className="flex-1 justify-end p-2">
        <View>
          <Text className="text-sm font-bold text-white" numberOfLines={3}>
            {item.title}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-white/90">
            {formatViews(item.view_count)} visualizações
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
