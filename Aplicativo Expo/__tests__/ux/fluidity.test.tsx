/**
 * UX fluidity, responsiveness, performance, and actionable-controls guarantees.
 * Complements screen-level tests with cross-cutting user-experience contracts.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';
import { playbackController } from '../../src/playback/PlaybackController';
import VideoCard from '../../src/components/VideoCard';
import {
  FEED_MIN_DAY_GAP,
  rankFeedVideos,
  uploadDayDiff,
} from '../../src/data/feedRanking';
import {
  SHORTS_PRELOAD_AHEAD,
  SHORTS_PRELOAD_BEHIND,
  shouldPreloadShortIndex,
} from '../../src/screens/shorts/preloadWindow';

const mockUseDatabase = jest.fn();
const mockGetVideoById = jest.fn();
const mockGetRelatedVideos = jest.fn();
const mockAddToHistory = jest.fn();
const mockSearchVideos = jest.fn();
const mockGetHomeFeed = jest.fn();
const mockGetShortVideos = jest.fn();
const mockGetAllCategories = jest.fn();
const mockRefresh = jest.fn();

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => mockUseDatabase(),
}));

jest.mock('../../src/data/videos', () => ({
  getVideoById: (...args: unknown[]) => mockGetVideoById(...args),
  getRelatedVideos: (...args: unknown[]) => mockGetRelatedVideos(...args),
  searchVideos: (...args: unknown[]) => mockSearchVideos(...args),
  getHomeFeed: (...args: unknown[]) => mockGetHomeFeed(...args),
  getShortVideos: (...args: unknown[]) => mockGetShortVideos(...args),
  getAllCategories: (...args: unknown[]) => mockGetAllCategories(...args),
}));

jest.mock('../../src/data/channels', () => ({
  getChannels: jest.fn(async () => []),
}));

jest.mock('../../src/data/history', () => ({
  addToHistory: (...args: unknown[]) => mockAddToHistory(...args),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return require('../helpers/navigationMock').withFocusEffect(actual);
});

import {
  FloatingPlayerProvider,
  useFloatingPlayer,
} from '../../src/context/FloatingPlayerContext';
import HomeScreen from '../../src/screens/HomeScreen';
import SearchScreen from '../../src/screens/SearchScreen';

const { __mockPlayer: player } = require('../../__mocks__/expo-video');

function FloatingProbe({
  onReady,
}: {
  onReady: (api: ReturnType<typeof useFloatingPlayer>) => void;
}) {
  const api = useFloatingPlayer();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

describe('UX fluidity', () => {
  describe('floating mini player continuity', () => {
    let api: ReturnType<typeof useFloatingPlayer> | null = null;

    beforeEach(() => {
      api = null;
      playbackController.reset();
      mockUseDatabase.mockReturnValue({ ready: true });
      mockAddToHistory.mockResolvedValue(undefined);
      mockGetRelatedVideos.mockResolvedValue([]);
      player.replace.mockClear();
      mockGetVideoById.mockResolvedValue(
        makeVideo({
          video_id: 'ux-1',
          title: 'Continuidade',
          mp4_sas_url: 'https://cdn/ux.mp4',
        })
      );
    });

    afterEach(() => {
      playbackController.reset();
    });

    it('maximizes the same video without reloading the source', async () => {
      render(
        <FloatingPlayerProvider>
          <FloatingProbe onReady={(value) => { api = value; }} />
        </FloatingPlayerProvider>
      );

      await waitFor(() => expect(api).not.toBeNull());
      await act(async () => {
        await api!.prepareVideo('ux-1');
      });
      await waitFor(() => expect(api!.video?.video_id).toBe('ux-1'));
      expect(player.replace).toHaveBeenCalledTimes(1);

      act(() => {
        api!.minimize();
      });
      await waitFor(() => expect(api!.mode).toBe('mini'));
      expect(playbackController.getActiveId()).toBe('player:ux-1');

      player.replace.mockClear();
      await act(async () => {
        await api!.prepareVideo('ux-1');
      });

      expect(player.replace).not.toHaveBeenCalled();
      expect(api!.mode).toBe('mini');

      act(() => {
        api!.maximize();
        api!.setPlayerScreenFocused(true);
      });
      await waitFor(() => expect(api!.mode).toBe('fullscreen'));
      expect(playbackController.getActiveId()).toBe('player:ux-1');
    });

    it('replaces source only when switching to a different video', async () => {
      mockGetVideoById
        .mockResolvedValueOnce(
          makeVideo({ video_id: 'ux-a', mp4_sas_url: 'https://cdn/a.mp4' })
        )
        .mockResolvedValueOnce(
          makeVideo({ video_id: 'ux-b', mp4_sas_url: 'https://cdn/b.mp4' })
        );

      render(
        <FloatingPlayerProvider>
          <FloatingProbe onReady={(value) => { api = value; }} />
        </FloatingPlayerProvider>
      );

      await waitFor(() => expect(api).not.toBeNull());
      await act(async () => {
        await api!.prepareVideo('ux-a');
      });
      await waitFor(() => expect(api!.video?.video_id).toBe('ux-a'));

      player.replace.mockClear();
      await act(async () => {
        await api!.prepareVideo('ux-b');
      });
      await waitFor(() => expect(api!.video?.video_id).toBe('ux-b'));
      expect(player.replace).toHaveBeenCalledWith('https://cdn/b.mp4');
    });
  });

  describe('search debounce responsiveness', () => {
    const navigation = { goBack: jest.fn(), navigate: jest.fn() };

    beforeEach(() => {
      jest.useFakeTimers();
      mockSearchVideos.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('waits 250ms before querying and collapses rapid keystrokes', async () => {
      render(<SearchScreen navigation={navigation as never} route={{} as never} />);
      const input = screen.getByTestId('search-input');

      fireEvent.changeText(input, 'r');
      fireEvent.changeText(input, 're');
      fireEvent.changeText(input, 'rea');
      fireEvent.changeText(input, 'react');

      expect(mockSearchVideos).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(250);
      });

      await waitFor(() => expect(mockSearchVideos).toHaveBeenCalledTimes(1));
      expect(mockSearchVideos).toHaveBeenCalledWith('react');
    });
  });

  describe('home feed loading states', () => {
    const navigation = { navigate: jest.fn() };

    beforeEach(() => {
      mockUseDatabase.mockReturnValue({
        ready: true,
        loading: false,
        error: null,
        refresh: mockRefresh,
        dbGeneration: 0,
        syncing: false,
      });
      mockGetAllCategories.mockResolvedValue(['All', 'Education']);
      mockGetHomeFeed.mockResolvedValue([
        makeVideo({ video_id: 'feed-1', title: 'Feed pronto' }),
      ]);
      mockGetShortVideos.mockResolvedValue([
        makeVideo({ video_id: 'short-ux', title: 'Short UX', width: 1080, height: 1920 }),
      ]);
    });

    it('shows interim loading copy then renders feed without blocking the header', async () => {
      let resolveFeed: (value: ReturnType<typeof makeVideo>[]) => void = () => undefined;
      let resolveCats: (value: string[]) => void = () => undefined;
      let resolveShorts: (value: ReturnType<typeof makeVideo>[]) => void = () => undefined;

      mockGetHomeFeed.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFeed = resolve;
          })
      );
      mockGetAllCategories.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCats = resolve;
          })
      );
      mockGetShortVideos.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveShorts = resolve;
          })
      );

      render(<HomeScreen navigation={navigation as never} route={{} as never} />);
      expect(screen.getByTestId('header-search')).toBeTruthy();
      await waitFor(() => expect(screen.getByTestId('home-feed-skeleton')).toBeTruthy());

      await act(async () => {
        resolveCats(['All', 'Education']);
        resolveShorts([]);
        resolveFeed([makeVideo({ video_id: 'feed-1', title: 'Feed pronto' })]);
      });

      await waitFor(() => expect(screen.getByText('Feed pronto')).toBeTruthy());
      expect(screen.queryByTestId('home-feed-skeleton')).toBeNull();
    });

    it('shows shorts carousel for the All category alias', async () => {
      render(<HomeScreen navigation={navigation as never} route={{} as never} />);
      await waitFor(() => expect(screen.getByTestId('category-chip-All')).toBeTruthy());
      fireEvent.press(screen.getByTestId('category-chip-All'));
      await waitFor(() => expect(screen.getByText('Short UX')).toBeTruthy());
      expect(screen.getByText('Shorts')).toBeTruthy();
      expect(mockGetShortVideos).toHaveBeenCalled();
    });
  });

  describe('shorts preload performance window', () => {
    it('limits mounted players to active + bounded ahead/behind window', () => {
      const activeIndex = 10;
      const total = 30;
      let preloadCount = 0;

      for (let index = 0; index < total; index += 1) {
        if (shouldPreloadShortIndex(index, activeIndex)) {
          preloadCount += 1;
        }
      }

      const maxWindow = 1 + SHORTS_PRELOAD_AHEAD + SHORTS_PRELOAD_BEHIND;
      expect(preloadCount).toBe(maxWindow);
      expect(shouldPreloadShortIndex(activeIndex - SHORTS_PRELOAD_BEHIND - 1, activeIndex)).toBe(
        false
      );
      expect(shouldPreloadShortIndex(activeIndex + SHORTS_PRELOAD_AHEAD + 1, activeIndex)).toBe(
        false
      );
    });
  });

  describe('actionable controls only', () => {
    it('does not expose a channel press target without channel_id', () => {
      const onChannelPress = jest.fn();
      const video = makeVideo({ video_id: 'no-ch', channel_id: null });
      render(
        <VideoCard video={video} onPress={jest.fn()} onChannelPress={onChannelPress} />
      );

      const channelNode = screen.getByTestId('video-card-channel-no-ch');
      fireEvent.press(channelNode);
      expect(onChannelPress).not.toHaveBeenCalled();
    });

    it('exposes channel press only when navigation is possible', () => {
      const onChannelPress = jest.fn();
      const video = makeVideo({ video_id: 'with-ch', channel_id: 'UCUX' });
      render(
        <VideoCard video={video} onPress={jest.fn()} onChannelPress={onChannelPress} />
      );

      fireEvent.press(screen.getByTestId('video-card-channel-with-ch'));
      expect(onChannelPress).toHaveBeenCalledWith(video);
    });
  });

  describe('feed ranking scalability', () => {
    it('ranks large catalogs without dropping items and keeps day-gap when possible', () => {
      const videos = Array.from({ length: 120 }, (_, index) =>
        makeVideo({
          video_id: `v-${index}`,
          upload_date: `2026${String((index % 12) + 1).padStart(2, '0')}15`,
          view_count: 1000 + index,
        })
      );

      const ranked = rankFeedVideos(videos, [], { random: () => 0.42 });

      expect(ranked).toHaveLength(videos.length);
      expect(new Set(ranked.map((v) => v.video_id)).size).toBe(videos.length);

      let gapsOk = 0;
      for (let i = 1; i < ranked.length; i += 1) {
        const gap = uploadDayDiff(ranked[i].upload_date, ranked[i - 1].upload_date);
        if (gap >= FEED_MIN_DAY_GAP) gapsOk += 1;
      }
      expect(gapsOk).toBeGreaterThan(0);
    });
  });
});
