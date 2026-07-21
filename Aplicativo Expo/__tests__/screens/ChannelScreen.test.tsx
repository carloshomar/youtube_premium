import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';

const mockUseDatabase = jest.fn();
const mockGetChannelById = jest.fn();
const mockGetVideosByChannel = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return require('../helpers/navigationMock').withFocusEffect(actual);
});

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => mockUseDatabase(),
}));

jest.mock('../../src/data/channels', () => ({
  getChannelById: (...args: unknown[]) => mockGetChannelById(...args),
}));

jest.mock('../../src/data/videos', () => ({
  getVideosByChannel: (...args: unknown[]) => mockGetVideosByChannel(...args),
}));

import ChannelScreen from '../../src/screens/ChannelScreen';

describe('ChannelScreen', () => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };

  beforeEach(() => {
    mockUseDatabase.mockReturnValue({ ready: true });
    mockGetChannelById.mockResolvedValue({
      id: 1,
      channel_id: 'UC1',
      channel_handle: '@teste',
      display_name: 'Canal Teste',
      channel_url: 'u',
      title: null,
      enabled: 1,
      limit_videos: 5,
      last_checked_at: null,
      last_error: null,
      created_at: 't',
      updated_at: 't',
    });
    mockGetVideosByChannel.mockResolvedValue([
      makeVideo({ video_id: 'c1', title: 'Do canal' }),
    ]);
  });

  it('loads channel videos and opens player', async () => {
    render(
      <ChannelScreen
        navigation={navigation as never}
        route={{ params: { channelId: 'UC1', channelName: 'Canal Teste' } } as never}
      />
    );

    await waitFor(() => expect(screen.getByText('Do canal')).toBeTruthy());
    expect(screen.getByText('@teste')).toBeTruthy();

    fireEvent.press(screen.getByTestId('channel-back'));
    expect(navigation.goBack).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('video-card-c1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Player', { videoId: 'c1' });
  });

  it('shows empty channel state', async () => {
    mockGetVideosByChannel.mockResolvedValue([]);
    mockGetChannelById.mockResolvedValue(null);
    render(
      <ChannelScreen
        navigation={navigation as never}
        route={{ params: { channelId: 'UCX' } } as never}
      />
    );
    await waitFor(() => expect(screen.getByText('Sem vídeos neste canal')).toBeTruthy());
  });

  it('ignores stale channel load after unmount', async () => {
    let resolveChannel: (value: unknown) => void = () => undefined;
    let resolveVideos: (value: unknown) => void = () => undefined;
    mockGetChannelById.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChannel = resolve;
        })
    );
    mockGetVideosByChannel.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVideos = resolve;
        })
    );
    const { unmount } = render(
      <ChannelScreen
        navigation={navigation as never}
        route={{ params: { channelId: 'UC1', channelName: 'Canal Teste' } } as never}
      />
    );
    unmount();
    await act(async () => {
      resolveChannel(null);
      resolveVideos([]);
    });
  });

  it('does nothing while database is not ready', async () => {
    mockUseDatabase.mockReturnValue({ ready: false });
    render(
      <ChannelScreen
        navigation={navigation as never}
        route={{ params: { channelId: 'UC1' } } as never}
      />
    );
    expect(mockGetChannelById).not.toHaveBeenCalled();
  });
});
