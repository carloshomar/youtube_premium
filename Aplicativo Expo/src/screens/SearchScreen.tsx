import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Icon from 'react-native-feather';
import VideoCard from '../components/VideoCard';
import { env } from '../config/env';
import { searchVideos } from '../data/videos';
import type { VideoRow } from '../data/types';
import type { RootStackScreenProps } from '../navigation/types';
import { themeColors } from '../theme';

export default function SearchScreen({ navigation }: RootStackScreenProps<'Search'>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoRow[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchVideos(query);
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, env.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: themeColors.bg }}>
        <View className="flex-row items-center px-3 pb-3">
          <Pressable testID="search-back" onPress={() => navigation.goBack()} className="mr-2 p-2">
            <Icon.ArrowLeft color="#fff" width={22} height={22} />
          </Pressable>
          <View className="flex-1 flex-row items-center rounded-full bg-white/10 px-3">
            <Icon.Search color="#aaa" width={18} height={18} />
            <TextInput
              testID="search-input"
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar vídeos ou canais"
              placeholderTextColor="#888"
              className="ml-2 flex-1 py-2.5 text-base text-white"
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')}>
                <Icon.X color="#aaa" width={18} height={18} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {searching ? <Text className="mx-4 mb-2 text-neutral-400">Buscando…</Text> : null}

      <FlatList
        data={results}
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
            {query ? 'Nenhum resultado' : 'Digite para buscar no catálogo local'}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
