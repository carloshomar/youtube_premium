import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppHeader, { LoadingBlock } from '../components/AppHeader';
import VideoCard from '../components/VideoCard';
import { useDatabase } from '../context/DatabaseContext';
import type { GenreRepresentative } from '../data/musicGenres';
import { getMusicGenreFeed } from '../data/videos';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { themeColors } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Music'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function MusicScreen({ navigation }: Props) {
  const { ready, dbGeneration } = useDatabase();
  const [items, setItems] = useState<GenreRepresentative[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const feed = await getMusicGenreFeed();
      setItems(feed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      setLoading(true);
      void load();
    }, [ready, load, dbGeneration])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (loading && !refreshing) {
    return <LoadingBlock label="Carregando Music…" />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: themeColors.bg }}>
        <AppHeader title="Music" onSearchPress={() => navigation.navigate('Search')} />
      </SafeAreaView>

      <Text className="mx-4 mb-3 text-sm text-neutral-400">
        Um destaque por gênero · ordenado por escutas e relevância
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.genreKey}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <Text className="mx-4 mt-8 text-center text-sm text-neutral-400">
            Nenhuma música com gênero encontrada
          </Text>
        }
        renderItem={({ item }) => (
          <View testID={`music-genre-${item.genreKey}`}>
            <Text className="mx-4 mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {item.genreLabel}
            </Text>
            <VideoCard
              video={item.video}
              onPress={(v) => navigation.navigate('Player', { videoId: v.video_id })}
              onChannelPress={(v) => {
                if (!v.channel_id) return;
                navigation.navigate('Channel', {
                  channelId: v.channel_id,
                  channelName: v.channel || undefined,
                });
              }}
            />
          </View>
        )}
      />
    </View>
  );
}
