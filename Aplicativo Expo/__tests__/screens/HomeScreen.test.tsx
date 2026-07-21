import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';

const mockUseDatabase = jest.fn();
const mockGetHomeFeed = jest.fn();
const mockGetShortVideos = jest.fn();
const mockGetAllCategories = jest.fn();
const mockGetChannels = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return require('../helpers/navigationMock').withFocusEffect(actual);
});

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => mockUseDatabase(),
}));

jest.mock('../../src/data/videos', () => ({
  getHomeFeed: (...args: unknown[]) => mockGetHomeFeed(...args),
  getShortVideos: (...args: unknown[]) => mockGetShortVideos(...args),
  getAllCategories: (...args: unknown[]) => mockGetAllCategories(...args),
}));

jest.mock('../../src/data/channels', () => ({
  getChannels: (...args: unknown[]) => mockGetChannels(...args),
}));

import HomeScreen from '../../src/screens/HomeScreen';

describe('HomeScreen', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    navigation.navigate.mockReset();
    mockRefresh.mockReset().mockResolvedValue(undefined);
    mockUseDatabase.mockReturnValue({
      ready: true,
      loading: false,
      error: null,
      refresh: mockRefresh,
      dbGeneration: 0,
      syncing: false,
    });
    mockGetAllCategories.mockResolvedValue(['Todos', 'Education']);
    mockGetHomeFeed.mockResolvedValue([
      makeVideo({ video_id: 'v1', title: 'Video Um', channel_id: 'UC1' }),
    ]);
    mockGetShortVideos.mockResolvedValue([
      makeVideo({ video_id: 's1', title: 'Short Um', width: 1080, height: 1920 }),
    ]);
    mockGetChannels.mockResolvedValue([
      {
        id: 1,
        channel_id: 'UC1',
        channel_url: 'u',
        channel_handle: '@a',
        title: 'Canal Home',
        display_name: 'Canal Home',
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: 't',
        updated_at: 't',
        video_count: 3,
        total_views: 100,
      },
    ]);
  });

  it('shows loading while database boots', () => {
    mockUseDatabase.mockReturnValue({
      ready: false,
      loading: true,
      error: null,
      refresh: mockRefresh,
      dbGeneration: 0,
      syncing: false,
    });
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);
    expect(screen.getByText('Baixando catálogo SQLite…')).toBeTruthy();
  });

  it('shows error and retries', async () => {
    mockUseDatabase.mockReturnValue({
      ready: false,
      loading: false,
      error: 'offline',
      refresh: mockRefresh,
      dbGeneration: 0,
      syncing: false,
    });
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);
    expect(screen.getByText('Não foi possível carregar os dados')).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-retry'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('renders feed, shorts, channels and navigates to player/search/channel', async () => {
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);

    await waitFor(() => {
      expect(screen.getByText('Video Um')).toBeTruthy();
      expect(screen.getByText('Shorts')).toBeTruthy();
      expect(screen.getByText('Canais')).toBeTruthy();
      expect(screen.getByText('Canal Home')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('header-search'));
    expect(navigation.navigate).toHaveBeenCalledWith('Search');

    fireEvent.press(screen.getByTestId('video-card-v1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Player', { videoId: 'v1' });

    fireEvent.press(screen.getByTestId('video-card-channel-v1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC1',
      channelName: 'Canal Teste',
    });

    fireEvent.press(screen.getByTestId('home-channel-UC1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC1',
      channelName: 'Canal Home',
    });

    fireEvent.press(screen.getByTestId('short-card-s1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Player', { videoId: 's1' });
  });

  it('hides shorts section outside Todos category', async () => {
    mockGetHomeFeed.mockResolvedValue([
      makeVideo({ video_id: 'edu-1', title: 'Video Edu', categories: '["Education"]' }),
    ]);
    mockGetShortVideos.mockResolvedValue([
      makeVideo({ video_id: 's1', title: 'Short Um', width: 1080, height: 1920 }),
    ]);
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);

    await waitFor(() => expect(screen.getByText('Shorts')).toBeTruthy());

    fireEvent.press(screen.getByTestId('category-chip-Education'));

    await waitFor(() => expect(screen.getByText('Video Edu')).toBeTruthy());
    expect(screen.queryByText('Shorts')).toBeNull();
    expect(screen.queryByText('Canais')).toBeNull();
    expect(mockGetShortVideos).toHaveBeenCalledTimes(1);
  });

  it('changes category and shows empty state', async () => {
    mockGetHomeFeed.mockResolvedValue([]);
    mockGetShortVideos.mockResolvedValue([]);
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);

    await waitFor(() => {
      expect(screen.getByTestId('category-chip-Education')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('category-chip-Education'));

    await waitFor(() => {
      expect(screen.getByText('Nenhum vídeo encontrado')).toBeTruthy();
    });
  });

  it('skips channel navigation when channel_id is missing', async () => {
    mockGetHomeFeed.mockResolvedValue([
      makeVideo({ video_id: 'v2', channel_id: null, title: 'Sem canal' }),
    ]);
    mockGetShortVideos.mockResolvedValue([]);
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);

    await waitFor(() => expect(screen.getByText('Sem canal')).toBeTruthy());
    fireEvent.press(screen.getByTestId('video-card-channel-v2'));
    expect(navigation.navigate).not.toHaveBeenCalledWith(
      'Channel',
      expect.anything()
    );
  });

  it('shows skeleton while feed loads', async () => {
    let resolveFeed: (value: ReturnType<typeof makeVideo>[]) => void = () => undefined;
    mockGetHomeFeed.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFeed = resolve;
        })
    );
    mockGetShortVideos.mockResolvedValue([]);
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);

    await waitFor(() => expect(screen.getByTestId('home-feed-skeleton')).toBeTruthy());
    expect(screen.getAllByTestId('video-card-skeleton').length).toBeGreaterThan(0);

    await act(async () => {
      resolveFeed([makeVideo({ video_id: 'v1', title: 'Video Um', channel_id: 'UC1' })]);
    });
    await waitFor(() => expect(screen.getByText('Video Um')).toBeTruthy());
    expect(screen.queryByTestId('home-feed-skeleton')).toBeNull();
  });

  it('keeps feed visible during pull-to-refresh', async () => {
    let resolveFeed: (value: ReturnType<typeof makeVideo>[]) => void = () => undefined;
    mockGetHomeFeed.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFeed = resolve;
        })
    );
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);

    await act(async () => {
      resolveFeed([makeVideo({ video_id: 'v1', title: 'Video Um', channel_id: 'UC1' })]);
    });
    await waitFor(() => expect(screen.getByText('Video Um')).toBeTruthy());

    mockGetHomeFeed.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFeed = resolve;
        })
    );

    const scroll = screen.UNSAFE_getByType(require('react-native').ScrollView);
    await act(async () => {
      scroll.props.refreshControl.props.onRefresh();
    });

    expect(screen.getByText('Video Um')).toBeTruthy();
    expect(screen.queryByTestId('home-feed-skeleton')).toBeNull();

    await act(async () => {
      resolveFeed([makeVideo({ video_id: 'v1', title: 'Video Um', channel_id: 'UC1' })]);
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows shorts for the All category alias', async () => {
    mockGetAllCategories.mockResolvedValue(['All', 'Education']);
    mockGetShortVideos.mockResolvedValue([
      makeVideo({ video_id: 's-all', title: 'Short All', width: 1080, height: 1920 }),
    ]);
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByTestId('category-chip-All')).toBeTruthy());
    fireEvent.press(screen.getByTestId('category-chip-All'));
    await waitFor(() => expect(screen.getByText('Short All')).toBeTruthy());
    expect(screen.getByText('Shorts')).toBeTruthy();
  });

  it('opens channel with undefined name when channel field is null', async () => {
    mockGetHomeFeed.mockResolvedValue([
      makeVideo({
        video_id: 'v-null',
        title: 'Sem nome canal',
        channel_id: 'UC9',
        channel: null,
      }),
    ]);
    mockGetShortVideos.mockResolvedValue([]);
    render(<HomeScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByText('Sem nome canal')).toBeTruthy());
    fireEvent.press(screen.getByTestId('video-card-channel-v-null'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC9',
      channelName: undefined,
    });
  });
});
