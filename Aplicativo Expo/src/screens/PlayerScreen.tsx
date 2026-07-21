import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Icon from 'react-native-feather';
import { LoadingBlock } from '../components/AppHeader';
import VideoCard from '../components/VideoCard';
import { useDatabase } from '../context/DatabaseContext';
import { useFloatingPlayer } from '../context/FloatingPlayerContext';
import { getVideoRating, setVideoRating, type VideoRating } from '../data/ratings';
import type { RootStackScreenProps } from '../navigation/types';
import { themeColors } from '../theme';
import { formatDuration, formatUploadDate, formatViews } from '../utils/format';

export default function PlayerScreen({ navigation, route }: RootStackScreenProps<'Player'>) {
  const { videoId } = route.params;
  const { ready } = useDatabase();
  const { width } = useWindowDimensions();
  const {
    video,
    player,
    loading: videoLoading,
    upNext,
    prepareVideo,
    playFromUpNext,
    removeFromUpNext,
    minimize,
    maximize,
    setPlayerScreenFocused,
  } = useFloatingPlayer();
  const [descExpanded, setDescExpanded] = useState(false);
  const [screenFocused, setScreenFocused] = useState(false);
  const [rating, setRating] = useState<VideoRating | null>(null);
  const prepareVideoRef = useRef(prepareVideo);
  prepareVideoRef.current = prepareVideo;

  const sourceUri = video?.video_id === videoId ? video.mp4_sas_url : null;

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      setPlayerScreenFocused(true);
      maximize();
      return () => {
        setScreenFocused(false);
        setPlayerScreenFocused(false);
      };
    }, [maximize, setPlayerScreenFocused])
  );

  // Only react to route videoId — do not re-prepare when prepareVideo identity changes
  // after playFromUpNext, or we snap back to the previous track.
  useEffect(() => {
    if (!ready) return;
    void prepareVideoRef.current(videoId);
  }, [ready, videoId]);

  useEffect(() => {
    let cancelled = false;
    setRating(null);
    void getVideoRating(videoId).then((value) => {
      if (!cancelled) setRating(value);
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // After autoplay / up-next advances the floating player, keep the stack route in sync.
  useEffect(() => {
    if (!screenFocused || !video || videoLoading) return;
    if (video.video_id === videoId) return;
    navigation.replace('Player', { videoId: video.video_id });
  }, [screenFocused, video, videoId, videoLoading, navigation]);

  const handleMinimize = useCallback(() => {
    minimize();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Tabs');
    }
  }, [minimize, navigation]);

  const openChannel = useCallback(() => {
    navigation.navigate('Channel', {
      channelId: video!.channel_id!,
      channelName: video!.channel || undefined,
    });
  }, [navigation, video]);

  const handleRating = useCallback(
    async (next: VideoRating) => {
      const saved = await setVideoRating(videoId, next);
      setRating(saved);
      if (saved === 'dislike') {
        removeFromUpNext([videoId]);
      }
    },
    [videoId, removeFromUpNext]
  );

  if (videoLoading || !video || video.video_id !== videoId) {
    return <LoadingBlock label="Abrindo vídeo…" />;
  }

  const playerHeight = Math.round((width * 9) / 16);
  const channelName = video.channel || video.uploader || 'Canal';
  const canOpenChannel = Boolean(video.channel_id);
  const liked = rating === 'like';
  const disliked = rating === 'dislike';

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.surface }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
        <View style={{ height: playerHeight, backgroundColor: '#000' }}>
          {sourceUri ? (
            <VideoView
              player={player}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              allowsPictureInPicture
              startsPictureInPictureAutomatically
              nativeControls
              fullscreenOptions={{ enable: true }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white">URL do vídeo indisponível</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1" style={{ backgroundColor: themeColors.bg }}>
        <View className="px-4 pt-3">
          <Pressable
            testID="player-minimize"
            onPress={handleMinimize}
            className="mb-2 self-start"
            accessibilityLabel="Minimizar vídeo"
          >
            <Icon.ChevronDown color="#fff" width={24} height={24} />
          </Pressable>

          <Text className="text-lg font-bold leading-6 text-white">{video.title}</Text>
          <Text className="mt-1 text-xs text-neutral-400">
            {formatViews(video.view_count)} visualizações
            {video.upload_date ? ` • ${formatUploadDate(video.upload_date)}` : ''}
            {` • ${formatDuration(video.duration_sec)}`}
          </Text>

          {canOpenChannel ? (
            <Pressable onPress={openChannel} className="mt-4 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-600">
                <Text className="font-bold text-white">
                  {channelName.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-white">{channelName}</Text>
                <Text className="text-xs text-neutral-400">
                  {formatViews(video.like_count)} curtidas
                </Text>
              </View>
            </Pressable>
          ) : (
            <View className="mt-4 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-600">
                <Text className="font-bold text-white">
                  {channelName.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-white">{channelName}</Text>
                <Text className="text-xs text-neutral-400">
                  {formatViews(video.like_count)} curtidas
                </Text>
              </View>
            </View>
          )}

          <View className="mt-4 flex-row items-center">
            <Pressable
              testID="player-like"
              onPress={() => void handleRating('like')}
              accessibilityLabel="Curtir"
              className="mr-3 flex-row items-center rounded-full bg-white/10 px-4 py-2"
            >
              <Icon.ThumbsUp
                color={liked ? themeColors.red : '#fff'}
                width={18}
                height={18}
                fill={liked ? themeColors.red : 'transparent'}
              />
              <Text className={`ml-2 text-sm font-semibold ${liked ? 'text-red-500' : 'text-white'}`}>
                Gostei
              </Text>
            </Pressable>
            <Pressable
              testID="player-dislike"
              onPress={() => void handleRating('dislike')}
              accessibilityLabel="Não gostei"
              className="flex-row items-center rounded-full bg-white/10 px-4 py-2"
            >
              <Icon.ThumbsDown
                color={disliked ? themeColors.red : '#fff'}
                width={18}
                height={18}
                fill={disliked ? themeColors.red : 'transparent'}
              />
              <Text
                className={`ml-2 text-sm font-semibold ${disliked ? 'text-red-500' : 'text-white'}`}
              >
                Não gostei
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setDescExpanded((v) => !v)}
            className="mt-4 rounded-xl bg-white/5 p-3"
          >
            <Text className="text-sm text-neutral-200" numberOfLines={descExpanded ? undefined : 3}>
              {video.description || 'Sem descrição'}
            </Text>
            <Text className="mt-2 text-xs font-semibold text-neutral-400">
              {descExpanded ? 'Mostrar menos' : 'Mostrar mais'}
            </Text>
          </Pressable>
        </View>

        <Text className="mx-4 mb-2 mt-6 text-base font-semibold text-white">Próximos</Text>
        {upNext.map((item) => (
          <VideoCard
            key={item.video_id}
            video={item}
            onPress={(v) => {
              void playFromUpNext(v.video_id);
            }}
            onChannelPress={(v) => {
              navigation.navigate('Channel', {
                channelId: v.channel_id!,
                channelName: v.channel || undefined,
              });
            }}
          />
        ))}
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
