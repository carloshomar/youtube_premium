import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import * as Icon from 'react-native-feather';
import { themeColors } from '../theme';

type Props = {
  onSearchPress?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
};

export default function AppHeader({ onSearchPress, showBack, onBack, title }: Props) {
  return (
    <View
      testID="app-header"
      style={{ backgroundColor: themeColors.bg }}
      className="flex-row items-center justify-between px-4 pb-2 pt-1"
    >
      <View className="flex-row items-center">
        {showBack ? (
          <Pressable testID="header-back" onPress={onBack} className="mr-3 p-1">
            <Icon.ArrowLeft color="#fff" width={22} height={22} />
          </Pressable>
        ) : null}
        {title ? (
          <Text className="text-lg font-semibold tracking-tight text-white">{title}</Text>
        ) : (
          <View className="flex-row items-center">
            <Image
              source={require('../../assets/icons/youtubeIcon.png')}
              className="mr-1 h-7 w-10"
              resizeMode="contain"
            />
            <Text className="text-xl font-semibold tracking-tighter text-white">YTube</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-x-4">
        {onSearchPress ? (
          <Pressable testID="header-search" onPress={onSearchPress}>
            <Icon.Search color="#fff" strokeWidth={1.2} width={22} height={22} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function LoadingBlock({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View
      testID="loading-block"
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: themeColors.bg }}
    >
      <ActivityIndicator color="#fff" size="large" />
      <Text className="mt-3 text-sm text-neutral-400">{label}</Text>
    </View>
  );
}
