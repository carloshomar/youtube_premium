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
import { useDatabase } from '../context/DatabaseContext';
import { getChannels } from '../data/channels';
import type { ChannelRow } from '../data/types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { themeColors } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Subscriptions'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function SubscriptionsScreen({ navigation }: Props) {
  const { ready, dbGeneration } = useDatabase();
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const data = await getChannels();
          if (active) setChannels(data);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [ready, dbGeneration])
  );

  if (loading) {
    return <LoadingBlock label="Carregando inscrições…" />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: themeColors.bg }}>
        <AppHeader title="Inscrições" onSearchPress={() => navigation.navigate('Search')} />
      </SafeAreaView>

      <FlatList
        data={channels}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        renderItem={({ item }) => {
          const name = item.display_name || item.channel_handle || 'Canal';
          const content = (
            <>
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-red-600">
                <Text className="text-lg font-bold text-white">
                  {name.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-white">{name}</Text>
                <Text className="text-xs text-neutral-400">
                  {item.channel_handle || item.channel_url}
                </Text>
                <Text className="mt-1 text-xs text-neutral-500">
                  {item.video_count ?? 0} vídeos
                </Text>
              </View>
            </>
          );

          if (!item.channel_id) {
            return (
              <View className="mb-3 flex-row items-center rounded-2xl bg-white/5 p-3">
                {content}
              </View>
            );
          }

          return (
            <Pressable
              onPress={() => {
                navigation.navigate('Channel', {
                  channelId: item.channel_id!,
                  channelName: name,
                });
              }}
              className="mb-3 flex-row items-center rounded-2xl bg-white/5 p-3"
            >
              {content}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text className="mt-10 text-center text-neutral-400">Nenhum canal no catálogo</Text>
        }
      />
    </View>
  );
}
