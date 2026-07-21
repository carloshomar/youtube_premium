import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { VideoView } from 'expo-video';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFloatingPlayer } from '../context/FloatingPlayerContext';
import { env } from '../config/env';
import type { RootStackParamList } from '../navigation/types';

const TAB_BAR_HEIGHT = env.tabBarHeight;

export default function FloatingMiniPlayer() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { mode, video, player, maximize } = useFloatingPlayer();

  if (mode !== 'mini' || !video) {
    return null;
  }

  const miniWidth = Math.round(width * 0.58);
  const miniHeight = Math.round((miniWidth * 9) / 16);
  const bottom = TAB_BAR_HEIGHT + insets.bottom + 8;

  const openFullscreen = () => {
    maximize();
    navigation.navigate('Player', { videoId: video.video_id });
  };

  return (
    <View
      testID="floating-mini-player"
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        zIndex: 100,
        elevation: 100,
        alignItems: 'flex-end',
        paddingHorizontal: 12,
      }}
    >
      <Pressable
        testID="floating-mini-player-expand"
        onPress={openFullscreen}
        style={{
          width: miniWidth,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#000',
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        {video.mp4_sas_url ? (
          <VideoView
            player={player}
            style={{ width: miniWidth, height: miniHeight }}
            contentFit="cover"
            nativeControls={false}
            testID="floating-mini-video-view"
          />
        ) : (
          <View
            style={{ width: miniWidth, height: miniHeight }}
            className="items-center justify-center bg-neutral-900"
          >
            <Text className="text-xs text-white">Sem vídeo</Text>
          </View>
        )}
        <View className="bg-black/80 px-2 py-1">
          <Text className="text-xs font-semibold text-white" numberOfLines={1}>
            {video.title || 'Vídeo'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
