import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';
import { playbackController } from '../../src/playback/PlaybackController';

const mockUseDatabase = jest.fn();
const mockPrepareVideo = jest.fn();
const mockPlayFromUpNext = jest.fn();
const mockRemoveFromUpNext = jest.fn();
const mockMinimize = jest.fn();
const mockMaximize = jest.fn();
const mockSetPlayerScreenFocused = jest.fn();
const mockGetVideoRating = jest.fn();
const mockSetVideoRating = jest.fn();

let mockFloatingVideo: ReturnType<typeof makeVideo> | null = makeVideo({
  video_id: 'play-1',
  title: 'Tocando agora',
  description: 'Linha1\nLinha2\nLinha3\nLinha4',
  channel_id: 'UC1',
  mp4_sas_url: 'https://cdn/video.mp4',
});
let mockFloatingLoading = false;
let mockUpNext: ReturnType<typeof makeVideo>[] = [];

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return require('../helpers/navigationMock').withFocusEffect(actual);
});

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => mockUseDatabase(),
}));

jest.mock('../../src/context/FloatingPlayerContext', () => ({
  useFloatingPlayer: () => ({
    video: mockFloatingVideo,
    player: require('../../__mocks__/expo-video').__mockPlayer,
    loading: mockFloatingLoading,
    upNext: mockUpNext,
    prepareVideo: (...args: unknown[]) => mockPrepareVideo(...args),
    playFromUpNext: (...args: unknown[]) => mockPlayFromUpNext(...args),
    removeFromUpNext: (...args: unknown[]) => mockRemoveFromUpNext(...args),
    minimize: (...args: unknown[]) => mockMinimize(...args),
    maximize: (...args: unknown[]) => mockMaximize(...args),
    dismiss: jest.fn(),
    setPlayerScreenFocused: (...args: unknown[]) => mockSetPlayerScreenFocused(...args),
    mode: 'fullscreen',
  }),
}));

jest.mock('../../src/data/ratings', () => ({
  getVideoRating: (...args: unknown[]) => mockGetVideoRating(...args),
  setVideoRating: (...args: unknown[]) => mockSetVideoRating(...args),
}));

import PlayerScreen from '../../src/screens/PlayerScreen';

describe('PlayerScreen', () => {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  };

  beforeEach(() => {
    playbackController.reset();
    mockUseDatabase.mockReturnValue({ ready: true });
    mockPrepareVideo.mockClear();
    mockPlayFromUpNext.mockClear();
    mockRemoveFromUpNext.mockClear();
    mockMinimize.mockClear();
    mockMaximize.mockClear();
    mockSetPlayerScreenFocused.mockClear();
    mockGetVideoRating.mockReset().mockResolvedValue(null);
    mockSetVideoRating.mockReset().mockImplementation(async (_id: string, rating: string) => rating);
    navigation.goBack.mockClear();
    navigation.navigate.mockClear();
    navigation.replace.mockClear();
    navigation.canGoBack.mockReturnValue(true);
    mockFloatingLoading = false;
    mockFloatingVideo = makeVideo({
      video_id: 'play-1',
      title: 'Tocando agora',
      description: 'Linha1\nLinha2\nLinha3\nLinha4',
      channel_id: 'UC1',
      mp4_sas_url: 'https://cdn/video.mp4',
    });
    mockUpNext = [makeVideo({ video_id: 'rel-1', title: 'Relacionado', channel_id: 'UC2' })];
  });

  afterEach(() => {
    playbackController.reset();
  });

  it('loads video via floating player and opens channel', async () => {
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );

    await waitFor(() => expect(screen.getByText('Tocando agora')).toBeTruthy());
    expect(mockPrepareVideo).toHaveBeenCalledWith('play-1');
    expect(mockMaximize).toHaveBeenCalled();
    expect(screen.getByTestId('video-view')).toBeTruthy();

    fireEvent.press(screen.getByText('Canal Teste'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC1',
      channelName: 'Canal Teste',
    });
  });

  it('does not open channel without channel_id', async () => {
    mockFloatingVideo = makeVideo({
      video_id: 'play-2',
      title: 'Sem canal id',
      channel_id: null,
      mp4_sas_url: 'https://cdn/v.mp4',
    });
    mockUpNext = [];
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-2' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('Sem canal id')).toBeTruthy());
    fireEvent.press(screen.getByText('Canal Teste'));
    expect(navigation.navigate).not.toHaveBeenCalledWith('Channel', expect.anything());
  });

  it('minimizes and returns to previous screen', async () => {
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('Tocando agora')).toBeTruthy());
    fireEvent.press(screen.getByTestId('player-minimize'));
    expect(mockMinimize).toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('minimizes to Tabs when stack cannot go back', async () => {
    navigation.canGoBack.mockReturnValue(false);
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('Tocando agora')).toBeTruthy());
    fireEvent.press(screen.getByTestId('player-minimize'));
    expect(mockMinimize).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('Tabs');
  });

  it('opens related channel', async () => {
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('Relacionado')).toBeTruthy());

    fireEvent.press(screen.getByTestId('video-card-channel-rel-1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC2',
      channelName: 'Canal Teste',
    });
  });

  it('expands description and opens related video', async () => {
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('Mostrar mais')).toBeTruthy());
    fireEvent.press(screen.getByText('Mostrar mais'));
    expect(screen.getByText('Mostrar menos')).toBeTruthy();

    await waitFor(() => expect(screen.getByTestId('video-card-rel-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('video-card-rel-1'));
    expect(mockPlayFromUpNext).toHaveBeenCalledWith('rel-1');
  });

  it('renders like/dislike and persists dislike out of recommendations', async () => {
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByTestId('player-like')).toBeTruthy());
    expect(screen.getByTestId('player-dislike')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('player-dislike'));
    });

    await waitFor(() => expect(mockSetVideoRating).toHaveBeenCalledWith('play-1', 'dislike'));
    expect(mockRemoveFromUpNext).toHaveBeenCalledWith(['play-1']);
  });

  it('shows missing url state', async () => {
    mockFloatingVideo = makeVideo({ video_id: 'x', title: 'Sem URL', mp4_sas_url: null });
    mockUpNext = [];
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'x' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('URL do vídeo indisponível')).toBeTruthy());
  });

  it('related channel press is skipped without channel_id', async () => {
    mockUpNext = [makeVideo({ video_id: 'rel-x', title: 'Rel X', channel_id: null })];
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('Rel X')).toBeTruthy());
    fireEvent.press(screen.getByTestId('video-card-channel-rel-x'));
    expect(navigation.navigate).not.toHaveBeenCalledWith('Channel', expect.anything());
  });

  it('waits while database is not ready', async () => {
    mockUseDatabase.mockReturnValue({ ready: false });
    mockFloatingVideo = null;
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    expect(screen.getByText('Abrindo vídeo…')).toBeTruthy();
    expect(mockPrepareVideo).not.toHaveBeenCalled();
  });

  it('waits while floating player is loading a different video', async () => {
    mockFloatingLoading = true;
    mockFloatingVideo = makeVideo({ video_id: 'other', title: 'Outro' });
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    expect(screen.getByText('Abrindo vídeo…')).toBeTruthy();
  });

  it('uses uploader/Canal fallbacks and empty description/date', async () => {
    mockFloatingVideo = makeVideo({
      video_id: 'play-3',
      title: 'Fallbacks',
      channel: null,
      uploader: 'Uploader X',
      channel_id: 'UC9',
      description: null,
      upload_date: null,
      mp4_sas_url: 'https://cdn/v.mp4',
    });
    mockUpNext = [
      makeVideo({
        video_id: 'rel-null',
        title: 'Rel null channel',
        channel_id: 'UC8',
        channel: null,
      }),
    ];
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-3' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('Fallbacks')).toBeTruthy());
    expect(screen.getByText('Uploader X')).toBeTruthy();
    expect(screen.getByText('Sem descrição')).toBeTruthy();

    fireEvent.press(screen.getByText('Uploader X'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC9',
      channelName: undefined,
    });

    await waitFor(() => expect(screen.getByText('Rel null channel')).toBeTruthy());
    fireEvent.press(screen.getByTestId('video-card-channel-rel-null'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC8',
      channelName: undefined,
    });
  });

  it('falls back to Canal when channel and uploader are missing', async () => {
    mockFloatingVideo = makeVideo({
      video_id: 'play-4',
      title: 'Sem nomes',
      channel: null,
      uploader: null,
      channel_id: null,
      mp4_sas_url: 'https://cdn/v.mp4',
    });
    mockUpNext = [];
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-4' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('Canal')).toBeTruthy());
  });

  it('syncs route when floating player advances past route videoId', async () => {
    mockFloatingVideo = makeVideo({
      video_id: 'auto-next',
      title: 'Auto next',
      mp4_sas_url: 'https://cdn/a.mp4',
    });
    mockUpNext = [];
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith('Player', { videoId: 'auto-next' })
    );
  });

  it('shows loading while route and floating video ids differ before sync', () => {
    mockFloatingLoading = true;
    mockFloatingVideo = makeVideo({ video_id: 'play-1', title: 'Tocando agora' });
    render(
      <PlayerScreen
        navigation={navigation as never}
        route={{ params: { videoId: 'play-1' } } as never}
      />
    );
    expect(screen.getByText('Abrindo vídeo…')).toBeTruthy();
  });
});
