import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LoadingBlock } from '../components/AppHeader';
import VideoCard from '../components/VideoCard';
import { useDatabase } from '../context/DatabaseContext';
import { getChannelById } from '../data/channels';
import { getVideosByChannel } from '../data/videos';
import type { ChannelRow, VideoRow } from '../data/types';
import type { RootStackScreenProps } from '../navigation/types';
import { themeColors } from '../theme';

export default function ChannelScreen({ navigation, route }: RootStackScreenProps<'Channel'>) {
  const { channelId, channelName } = route.params;
  const { ready } = useDatabase();
  const [channel, setChannel] = useState<ChannelRow | null>(null);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const [ch, feed] = await Promise.all([
            getChannelById(channelId),
            getVideosByChannel(channelId),
          ]);
          if (!active) return;
          setChannel(ch);
          setVideos(feed);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [ready, channelId])
  );

  const title =
    channel?.display_name || channelName || channel?.channel_handle || 'Canal';

  if (loading) {
    return <LoadingBlock label="Carregando canal…" />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: themeColors.bg }}>
        <View className="flex-row items-center px-3 pb-2">
          <Pressable testID="channel-back" onPress={() => navigation.goBack()} className="p-2">
            <Text className="text-white">‹ Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <View className="mx-4 mb-4 rounded-2xl bg-white/5 p-4">
        <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-red-600">
          <Text className="text-xl font-bold text-white">
            {title.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-bold text-white">{title}</Text>
        {channel?.channel_handle ? (
          <Text className="mt-1 text-sm text-neutral-400">{channel.channel_handle}</Text>
        ) : null}
        <Text className="mt-2 text-sm text-neutral-400">
          {videos.length} vídeo{videos.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        data={videos}
        keyExtractor={(item) => item.video_id}
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            onPress={(video) => navigation.navigate('Player', { videoId: video.video_id })}
          />
        )}
        ListEmptyComponent={
          <Text className="mx-4 mt-8 text-center text-neutral-400">Sem vídeos neste canal</Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
