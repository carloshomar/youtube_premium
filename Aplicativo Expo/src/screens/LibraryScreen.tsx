import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppHeader, { LoadingBlock } from '../components/AppHeader';
import VideoCard from '../components/VideoCard';
import { useDatabase } from '../context/DatabaseContext';
import { clearHistory, getHistoryIds } from '../data/history';
import { getVideoById } from '../data/videos';
import type { VideoRow } from '../data/types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { themeColors } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Library'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function LibraryScreen({ navigation }: Props) {
  const { ready } = useDatabase();
  const [history, setHistory] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ids = await getHistoryIds();
      const rows: VideoRow[] = [];
      for (const id of ids) {
        const video = await getVideoById(id);
        if (video) rows.push(video);
      }
      setHistory(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      void load();
    }, [ready, load])
  );

  if (loading) {
    return <LoadingBlock label="Carregando biblioteca…" />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: themeColors.bg }}>
        <AppHeader title="Biblioteca" onSearchPress={() => navigation.navigate('Search')} />
      </SafeAreaView>

      <View className="mx-4 mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-white">Histórico</Text>
        {history.length > 0 ? (
          <Pressable
            onPress={async () => {
              await clearHistory();
              setHistory([]);
            }}
          >
            <Text className="text-sm text-red-400">Limpar</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.video_id}
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            onPress={(video) => navigation.navigate('Player', { videoId: video.video_id })}
            onChannelPress={(video) => {
              navigation.navigate('Channel', {
                channelId: video.channel_id!,
                channelName: video.channel || undefined,
              });
            }}
          />
        )}
        ListEmptyComponent={
          <Text className="mx-4 mt-10 text-center text-neutral-400">
            Assista a um vídeo para ver o histórico aqui
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}
