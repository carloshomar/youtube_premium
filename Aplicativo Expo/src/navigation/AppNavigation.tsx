import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Icon from 'react-native-feather';
import HomeScreen from '../screens/HomeScreen';
import ShortsScreen from '../screens/ShortsScreen';
import MusicScreen from '../screens/MusicScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SearchScreen from '../screens/SearchScreen';
import PlayerScreen from '../screens/PlayerScreen';
import ChannelScreen from '../screens/ChannelScreen';
import FloatingMiniPlayer from '../components/FloatingMiniPlayer';
import { FloatingPlayerProvider } from '../context/FloatingPlayerContext';
import type { MainTabParamList, RootStackParamList } from './types';
import { themeColors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: themeColors.bg,
    card: themeColors.bg,
    primary: themeColors.red,
    text: '#fff',
    border: themeColors.border,
  },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0f0f',
          borderTopColor: '#303030',
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#aaa',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Icon.Home color={color} width={22} height={22} />,
        }}
      />
      <Tab.Screen
        name="Shorts"
        component={ShortsScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon.Film color={color} width={22} height={22} />,
        }}
      />
      <Tab.Screen
        name="Music"
        component={MusicScreen}
        options={{
          title: 'Music',
          tabBarIcon: ({ color }) => <Icon.PlayCircle color={color} width={22} height={22} />,
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{
          title: 'Inscrições',
          tabBarIcon: ({ color }) => <Icon.Youtube color={color} width={22} height={22} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => <Icon.Clock color={color} width={22} height={22} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigation() {
  return (
    <NavigationContainer theme={navTheme}>
      <FloatingPlayerProvider>
        <View style={{ flex: 1 }}>
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themeColors.bg } }}>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Player" component={PlayerScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Channel" component={ChannelScreen} />
          </Stack.Navigator>
          <FloatingMiniPlayer />
        </View>
      </FloatingPlayerProvider>
    </NavigationContainer>
  );
}
