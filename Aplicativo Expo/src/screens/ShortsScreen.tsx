import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LoadingBlock } from '../components/AppHeader';
import { env } from '../config/env';
import { useDatabase } from '../context/DatabaseContext';
import { getShortVideos } from '../data/videos';
import type { VideoRow } from '../data/types';
import { useExclusivePlayback } from '../playback/useExclusivePlayback';
import { playbackController } from '../playback/PlaybackController';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { formatViews } from '../utils/format';
import { shouldPreloadShortIndex } from './shorts/preloadWindow';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Shorts'>,
  NativeStackScreenProps<RootStackParamList>
>;

function shortSessionId(videoId: string) {
  return `short:${videoId}`;
}

/**
 * Mounts an expo-video player so buffering starts even before the cell is active.
 * VideoView is only shown for the current short (thumbnail covers preload neighbors).
 */
function ShortPlayerSlot({
  uri,
  sessionId,
  shouldPlay,
  showView,
}: {
  uri: string;
  sessionId: string;
  shouldPlay: boolean;
  showView: boolean;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.staysActiveInBackground = false;
    p.showNowPlayingNotification = false;
    p.bufferOptions = {
      preferredForwardBufferDuration: 10,
      waitsToMinimizeStalling: true,
      prioritizeTimeOverSizeThreshold: true,
      minBufferForPlayback: 1,
    };
  });

  useExclusivePlayback(sessionId, player, shouldPlay);

  useEffect(() => {
    try {
      player.muted = !shouldPlay;
      if (shouldPlay) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      // Native player may already be tearing down.
    }
  }, [player, shouldPlay]);

  if (!showView) {
    return null;
  }

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      testID="short-video-view"
    />
  );
}

function ShortItem({
  video,
  index,
  activeIndex,
  shouldPlay,
  height,
  screenFocused,
  onPress,
}: {
  video: VideoRow;
  index: number;
  activeIndex: number;
  shouldPlay: boolean;
  height: number;
  screenFocused: boolean;
  onPress: () => void;
}) {
  const uri = video.mp4_sas_url;
  const thumb = video.thumb_sas_url || video.thumbnail || undefined;
  const isCurrent = index === activeIndex && screenFocused;
  const shouldMountPlayer =
    Boolean(uri) && screenFocused && shouldPreloadShortIndex(index, activeIndex);

  return (
    <Pressable
      testID={`short-item-${video.video_id}`}
      onPress={onPress}
      style={{ height, width: '100%', backgroundColor: '#000' }}
    >
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : null}

      {shouldMountPlayer && uri ? (
        <ShortPlayerSlot
          uri={uri}
          sessionId={shortSessionId(video.video_id)}
          shouldPlay={shouldPlay && isCurrent}
          showView={isCurrent}
        />
      ) : null}

      {!uri && !thumb ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-white">Sem vídeo</Text>
        </View>
      ) : null}

      {isCurrent && !shouldPlay ? (
        <View
          testID="short-paused-overlay"
          className="absolute inset-0 items-center justify-center bg-black/30"
          pointerEvents="none"
        >
          <Text className="text-lg font-semibold text-white">Pausado</Text>
        </View>
      ) : null}

      <View className="absolute bottom-16 left-4 right-16" pointerEvents="none">
        <Text className="text-base font-bold text-white" numberOfLines={3}>
          {video.title}
        </Text>
        <Text className="mt-1 text-sm text-white/80">
          {video.channel} • {formatViews(video.view_count)} visualizações
        </Text>
      </View>
    </Pressable>
  );
}

export default function ShortsScreen({ navigation }: Props) {
  const { ready } = useDatabase();
  const { height: windowHeight } = useWindowDimensions();
  const [items, setItems] = useState<VideoRow[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [screenFocused, setScreenFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeIndexRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);
  const itemsRef = useRef<VideoRow[]>([]);

  const itemHeight = windowHeight;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const selectIndex = useCallback((nextIndex: number) => {
    const feed = itemsRef.current;
    if (nextIndex < 0 || nextIndex >= feed.length) return;
    if (nextIndex === activeIndexRef.current) return;
    playbackController.pauseAll();
    activeIndexRef.current = nextIndex;
    const nextId = feed[nextIndex].video_id;
    activeIdRef.current = nextId;
    setActiveIndex(nextIndex);
    setActiveId(nextId);
    setUserPaused(false);
  }, []);

  const selectIndexRef = useRef(selectIndex);
  selectIndexRef.current = selectIndex;

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      setUserPaused(false);

      if (!ready) {
        return () => {
          setScreenFocused(false);
          playbackController.pauseAll();
        };
      }

      let active = true;
      (async () => {
        setLoading(true);
        try {
          const feed = await getShortVideos();
          // istanbul ignore next -- race: unfocused before fetch resolves
          if (!active) return;
          setItems(feed);
          const keepId = activeIdRef.current;
          const keepIndex = keepId ? feed.findIndex((v) => v.video_id === keepId) : -1;
          const nextIndex = keepIndex >= 0 ? keepIndex : 0;
          const nextId = feed.length > 0 ? feed[nextIndex].video_id : null;
          setActiveIndex(nextIndex);
          setActiveId(nextId);
          activeIndexRef.current = nextIndex;
          activeIdRef.current = nextId;
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
        setScreenFocused(false);
        playbackController.pauseAll();
      };
    }, [ready])
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (first?.index == null || first.index < 0) return;
      selectIndexRef.current(first.index);
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: env.shortsVisiblePct,
    minimumViewTime: env.shortsMinViewMs,
  }).current;

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const next = Math.round(y / itemHeight);
      selectIndex(next);
    },
    [itemHeight, selectIndex]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<VideoRow> | null | undefined, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight]
  );

  const extraData = useMemo(
    () => ({ activeIndex, activeId, screenFocused, userPaused }),
    [activeIndex, activeId, screenFocused, userPaused]
  );

  if (loading) {
    return <LoadingBlock label="Carregando Shorts…" />;
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView edges={['top']} className="absolute z-10 w-full flex-row justify-between px-4">
        <Text className="text-lg font-bold text-white">Shorts</Text>
        <Pressable onPress={() => navigation.navigate('Search')}>
          <Text className="text-white">Buscar</Text>
        </Pressable>
      </SafeAreaView>

      <FlatList
        data={items}
        keyExtractor={(item) => item.video_id}
        pagingEnabled
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        extraData={extraData}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        renderItem={({ item, index }) => {
          const isCurrent = index === activeIndex && screenFocused;
          const shouldPlay = isCurrent && !userPaused;
          return (
            <ShortItem
              video={item}
              index={index}
              activeIndex={activeIndex}
              shouldPlay={shouldPlay}
              height={itemHeight}
              screenFocused={screenFocused}
              onPress={() => {
                if (item.video_id === activeId) {
                  setUserPaused((paused) => !paused);
                }
              }}
            />
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center" style={{ height: itemHeight }}>
            <Text className="text-white">Nenhum short disponível</Text>
          </View>
        }
      />
    </View>
  );
}
