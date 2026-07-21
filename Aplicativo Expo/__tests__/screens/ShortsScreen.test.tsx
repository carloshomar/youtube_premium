import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';
import { playbackController } from '../../src/playback/PlaybackController';

const mockUseDatabase = jest.fn();
const mockGetShortVideos = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return require('../helpers/navigationMock').withFocusEffect(actual);
});

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => mockUseDatabase(),
}));

jest.mock('../../src/data/videos', () => ({
  getShortVideos: (...args: unknown[]) => mockGetShortVideos(...args),
}));

import ShortsScreen from '../../src/screens/ShortsScreen';

const { __mockPlayer: player } = require('../../__mocks__/expo-video');

describe('ShortsScreen', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    playbackController.reset();
    mockUseDatabase.mockReturnValue({ ready: true });
    player.play.mockClear();
    player.pause.mockClear();
    mockGetShortVideos.mockResolvedValue([
      makeVideo({
        video_id: 'short-1',
        title: 'Short ativo',
        mp4_sas_url: 'https://cdn/s.mp4',
        width: 1080,
        height: 1920,
      }),
    ]);
  });

  afterEach(() => {
    playbackController.reset();
  });

  it('renders shorts feed and search shortcut', async () => {
    render(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByText('Short ativo')).toBeTruthy());
    fireEvent.press(screen.getByText('Buscar'));
    expect(navigation.navigate).toHaveBeenCalledWith('Search');
  });

  it('plays only the active short exclusively', async () => {
    render(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByText('Short ativo')).toBeTruthy());
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:short-1'));
    expect(screen.getByTestId('short-video-view')).toBeTruthy();
    expect(player.play).toHaveBeenCalled();
  });

  it('shows empty shorts state when there are no vertical videos', async () => {
    mockGetShortVideos.mockResolvedValue([]);
    render(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByText('Nenhum short disponível')).toBeTruthy());
  });

  it('handles short without mp4 url', async () => {
    mockGetShortVideos.mockResolvedValue([
      makeVideo({
        video_id: 'no-url',
        title: 'Sem mp4',
        mp4_sas_url: null,
        thumbnail: null,
        thumb_sas_url: null,
      }),
    ]);
    render(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByText('Sem vídeo')).toBeTruthy());
  });

  it('shows placeholder for inactive short without thumbnail', async () => {
    mockGetShortVideos.mockResolvedValue([
      makeVideo({
        video_id: 'a',
        title: 'Short A',
        mp4_sas_url: 'https://a.mp4',
        thumbnail: null,
        thumb_sas_url: null,
      }),
      makeVideo({
        video_id: 'b',
        title: 'Short B',
        mp4_sas_url: 'https://b.mp4',
        thumbnail: null,
        thumb_sas_url: null,
      }),
    ]);
    render(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByTestId('short-item-b')).toBeTruthy());
    fireEvent.press(screen.getByTestId('short-item-b'));
    expect(playbackController.getActiveId()).toBe('short:a');
  });

  it('keeps previous active short when feed reloads with same ids', async () => {
    mockGetShortVideos.mockResolvedValue([
      makeVideo({ video_id: 'a', title: 'Short A', mp4_sas_url: 'https://a.mp4' }),
      makeVideo({ video_id: 'b', title: 'Short B', mp4_sas_url: 'https://b.mp4' }),
    ]);
    const { rerender, unmount } = render(
      <ShortsScreen navigation={navigation as never} route={{} as never} />
    );
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:a'));

    const list = screen.UNSAFE_getByType(require('react-native').FlatList);
    act(() => {
      list.props.onViewableItemsChanged({
        viewableItems: [{ isViewable: true, item: { video_id: 'b' }, index: 1 }],
      });
    });
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:b'));

    mockUseDatabase.mockReturnValue({ ready: false });
    rerender(<ShortsScreen navigation={navigation as never} route={{} as never} />);

    mockUseDatabase.mockReturnValue({ ready: true });
    rerender(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:b'));

    unmount();
    expect(playbackController.getActiveId()).toBeNull();
  });

  it('switches exclusive playback when viewability changes', async () => {
    mockGetShortVideos.mockResolvedValue([
      makeVideo({
        video_id: 'a',
        title: 'Short A',
        mp4_sas_url: 'https://a.mp4',
        thumb_sas_url: 'https://a.jpg',
      }),
      makeVideo({
        video_id: 'b',
        title: 'Short B',
        mp4_sas_url: 'https://b.mp4',
        thumb_sas_url: 'https://b.jpg',
      }),
    ]);
    render(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:a'));

    const list = screen.UNSAFE_getByType(require('react-native').FlatList);
    act(() => {
      list.props.onViewableItemsChanged({
        viewableItems: [{ isViewable: true, item: { video_id: 'b' }, index: 1 }],
      });
    });

    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:b'));
    expect(screen.getByTestId('short-item-b')).toBeTruthy();
  });

  it('syncs active short from momentum scroll end', async () => {
    mockGetShortVideos.mockResolvedValue([
      makeVideo({ video_id: 'a', title: 'Short A', mp4_sas_url: 'https://a.mp4' }),
      makeVideo({ video_id: 'b', title: 'Short B', mp4_sas_url: 'https://b.mp4' }),
    ]);
    render(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:a'));

    const list = screen.UNSAFE_getByType(require('react-native').FlatList);
    const itemHeight = list.props.snapToInterval;
    expect(list.props.getItemLayout(null, 1)).toEqual({
      length: itemHeight,
      offset: itemHeight,
      index: 1,
    });

    act(() => {
      list.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { y: itemHeight } },
      });
    });
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:b'));

    act(() => {
      list.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { y: itemHeight } },
      });
    });
    expect(playbackController.getActiveId()).toBe('short:b');

    act(() => {
      list.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { y: itemHeight * 99 } },
      });
    });
    expect(playbackController.getActiveId()).toBe('short:b');
  });

  it('toggles pause on tap like YTube Shorts', async () => {
    render(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:short-1'));

    fireEvent.press(screen.getByTestId('short-item-short-1'));
    await waitFor(() => expect(playbackController.getActiveId()).toBeNull());
    expect(screen.getByTestId('short-paused-overlay')).toBeTruthy();

    fireEvent.press(screen.getByTestId('short-item-short-1'));
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:short-1'));
  });

  it('ignores viewability updates without index', async () => {
    render(<ShortsScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(playbackController.getActiveId()).toBe('short:short-1'));
    const list = screen.UNSAFE_getByType(require('react-native').FlatList);
    act(() => {
      list.props.onViewableItemsChanged({ viewableItems: [] });
      list.props.onViewableItemsChanged({
        viewableItems: [{ isViewable: true, item: { video_id: 'x' } }],
      });
    });
    expect(playbackController.getActiveId()).toBe('short:short-1');
  });

  it('does not load while database is not ready', () => {
    mockUseDatabase.mockReturnValue({ ready: false });
    const { unmount } = render(
      <ShortsScreen navigation={navigation as never} route={{} as never} />
    );
    expect(screen.getByText('Carregando Shorts…')).toBeTruthy();
    expect(mockGetShortVideos).not.toHaveBeenCalled();
    unmount();
    expect(playbackController.getActiveId()).toBeNull();
  });

  it('ignores short feed resolution after unmount', async () => {
    let resolveFeed: (value: ReturnType<typeof makeVideo>[]) => void = () => undefined;
    mockGetShortVideos.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFeed = resolve;
        })
    );
    const { unmount } = render(
      <ShortsScreen navigation={navigation as never} route={{} as never} />
    );
    unmount();
    await act(async () => {
      resolveFeed([]);
    });
  });
});
