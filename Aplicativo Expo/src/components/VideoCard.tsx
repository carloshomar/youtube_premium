import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import * as Icon from 'react-native-feather';
import type { VideoRow } from '../data/types';
import { formatDuration, formatUploadDate, formatViews } from '../utils/format';

type Props = {
  video: VideoRow;
  onPress: (video: VideoRow) => void;
  onChannelPress?: (video: VideoRow) => void;
};

export default function VideoCard({ video, onPress, onChannelPress }: Props) {
  const thumb = video.thumb_sas_url || video.thumbnail || undefined;
  const channelName = video.channel || video.uploader || 'Canal';
  const initial = channelName.trim().charAt(0).toUpperCase() || '?';
  const canOpenChannel = Boolean(onChannelPress && video.channel_id);

  const channelAvatar = (
    <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-red-600">
      <Text className="text-sm font-bold text-white">{initial}</Text>
    </View>
  );

  return (
    <Pressable
      testID={`video-card-${video.video_id}`}
      onPress={() => onPress(video)}
      className="mb-4"
    >
      <View className="relative mx-3 overflow-hidden rounded-xl bg-black">
        {thumb ? (
          <Image source={{ uri: thumb }} className="h-52 w-full" resizeMode="cover" />
        ) : (
          <View className="h-52 w-full items-center justify-center bg-neutral-800">
            <Icon.Play color="#fff" width={36} height={36} />
          </View>
        )}
        <View className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5">
          <Text className="text-xs font-semibold text-white">
            {formatDuration(video.duration_sec)}
          </Text>
        </View>
      </View>

      <View className="mx-3 mt-2 flex-row items-start">
        {canOpenChannel ? (
          <Pressable
            testID={`video-card-channel-${video.video_id}`}
            onPress={() => onChannelPress?.(video)}
          >
            {channelAvatar}
          </Pressable>
        ) : (
          <View testID={`video-card-channel-${video.video_id}`}>{channelAvatar}</View>
        )}

        <View className="flex-1">
          <Text className="text-[15px] font-semibold leading-5 text-white" numberOfLines={2}>
            {video.title}
          </Text>
          <Text className="mt-1 text-xs text-neutral-400" numberOfLines={1}>
            {channelName} • {formatViews(video.view_count)} visualizações
            {video.upload_date ? ` • ${formatUploadDate(video.upload_date)}` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
