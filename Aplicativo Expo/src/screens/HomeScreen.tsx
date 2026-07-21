import React, { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader, { LoadingBlock } from '../components/AppHeader';
import CategoryChips from '../components/CategoryChips';
import HomeFeedSkeleton from '../components/VideoCardSkeleton';
import ShortVideoCard from '../components/ShortVideoCard';
import VideoCard from '../components/VideoCard';
import { useDatabase } from '../context/DatabaseContext';
import { getChannels } from '../data/channels';
import { getAllCategories, getHomeFeed, getShortVideos } from '../data/videos';
import type { ChannelRow, VideoRow } from '../data/types';
import type { HomeTabProps } from '../navigation/types';
import { themeColors } from '../theme';
import { env } from '../config/env';

const HOME_CHANNEL_LIMIT = env.homeChannelLimit;

export default function HomeScreen({ navigation }: HomeTabProps) {
  const { ready, loading: dbLoading, error, refresh, dbGeneration } = useDatabase();
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [shorts, setShorts] = useState<VideoRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todos']);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const loadFeed = useCallback(async (category: string) => {
    setLoadingFeed(true);
    try {
      const showExtras = category === 'Todos' || category === 'All';
      const [cats, feed, shortFeed, channelFeed] = await Promise.all([
        getAllCategories(),
        getHomeFeed(category),
        showExtras ? getShortVideos() : Promise.resolve([] as VideoRow[]),
        showExtras ? getChannels() : Promise.resolve([] as ChannelRow[]),
      ]);
      setCategories(cats);
      setVideos(feed);
      setShorts(shortFeed);
      setChannels(channelFeed.slice(0, HOME_CHANNEL_LIMIT));
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready) {
        void loadFeed(activeCategory);
      }
    }, [ready, activeCategory, loadFeed, dbGeneration])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      await loadFeed(activeCategory);
    } finally {
      setRefreshing(false);
    }
  };

  const openPlayer = (video: VideoRow) => {
    navigation.navigate('Player', { videoId: video.video_id });
  };

  const openChannel = (video: VideoRow) => {
    navigation.navigate('Channel', {
      channelId: video.channel_id!,
      channelName: video.channel || undefined,
    });
  };

  const openRecommendedChannel = (channel: ChannelRow) => {
    if (!channel.channel_id) return;
    navigation.navigate('Channel', {
      channelId: channel.channel_id,
      channelName: channel.display_name || undefined,
    });
  };

  if (dbLoading && !ready) {
    return <LoadingBlock label="Baixando catálogo SQLite…" />;
  }

  if (error && !ready) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: themeColors.bg }}>
        <Text className="mb-2 text-center text-base text-white">Não foi possível carregar os dados</Text>
        <Text className="mb-4 text-center text-sm text-neutral-400">{error}</Text>
        <Text testID="home-retry" className="text-red-500" onPress={() => void refresh()}>
          Tentar novamente
        </Text>
      </View>
    );
  }

  const showExtras = activeCategory === 'Todos' || activeCategory === 'All';

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: themeColors.bg }}>
        <AppHeader onSearchPress={() => navigation.navigate('Search')} />
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        <View className="py-3">
          <CategoryChips
            categories={categories}
            active={activeCategory}
            onChange={(cat) => {
              setActiveCategory(cat);
            }}
          />
        </View>

        {showExtras && channels.length > 0 ? (
          <View className="mb-4 mt-1">
            <Text className="mx-4 mb-3 text-lg font-semibold tracking-tight text-white">Canais</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3">
              {channels.map((channel) => {
                const name = channel.display_name || channel.channel_handle || 'Canal';
                const initial = name.trim().charAt(0).toUpperCase() || '?';
                return (
                  <Pressable
                    key={String(channel.id)}
                    testID={`home-channel-${channel.channel_id ?? channel.id}`}
                    onPress={() => openRecommendedChannel(channel)}
                    className="mr-3 w-20 items-center"
                  >
                    <View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-red-600">
                      <Text className="text-lg font-bold text-white">{initial}</Text>
                    </View>
                    <Text className="text-center text-xs text-white" numberOfLines={2}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {showExtras && shorts.length > 0 ? (
          <View className="mb-4 mt-1">
            <View className="mx-4 mb-3 flex-row items-center">
              <Image
                source={require('../../assets/icons/shortsIcon.png')}
                className="mr-2 h-6 w-5"
                resizeMode="contain"
              />
              <Text className="text-lg font-semibold tracking-tight text-white">Shorts</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3">
              {shorts.map((item) => (
                <ShortVideoCard key={item.video_id} item={item} onPress={openPlayer} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {loadingFeed && !refreshing ? (
          <HomeFeedSkeleton showShorts={showExtras} />
        ) : (
          videos.map((video) => (
            <VideoCard
              key={video.video_id}
              video={video}
              onPress={openPlayer}
              onChannelPress={openChannel}
            />
          ))
        )}

        {!loadingFeed && videos.length === 0 ? (
          <Text className="mx-4 my-8 text-center text-neutral-400">Nenhum vídeo encontrado</Text>
        ) : null}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
