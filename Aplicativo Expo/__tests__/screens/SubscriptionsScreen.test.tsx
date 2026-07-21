import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';

const mockUseDatabase = jest.fn();
const mockGetChannels = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return require('../helpers/navigationMock').withFocusEffect(actual);
});

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => mockUseDatabase(),
}));

jest.mock('../../src/data/channels', () => ({
  getChannels: (...args: unknown[]) => mockGetChannels(...args),
}));

import SubscriptionsScreen from '../../src/screens/SubscriptionsScreen';

describe('SubscriptionsScreen', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    mockUseDatabase.mockReturnValue({ ready: true });
    mockGetChannels.mockResolvedValue([
      {
        id: 1,
        channel_id: 'UC1',
        display_name: 'Canal A',
        channel_handle: '@a',
        channel_url: 'u',
        video_count: 3,
        title: null,
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: 't',
        updated_at: 't',
      },
    ]);
  });

  it('lists channels and opens channel screen', async () => {
    render(
      <SubscriptionsScreen navigation={navigation as never} route={{} as never} />
    );
    await waitFor(() => expect(screen.getByText('Canal A')).toBeTruthy());
    fireEvent.press(screen.getByText('Canal A'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC1',
      channelName: 'Canal A',
    });
  });

  it('shows empty subscriptions', async () => {
    mockGetChannels.mockResolvedValue([]);
    render(
      <SubscriptionsScreen navigation={navigation as never} route={{} as never} />
    );
    await waitFor(() =>
      expect(screen.getByText('Nenhum canal no catálogo')).toBeTruthy()
    );
  });

  it('opens search from header', async () => {
    render(
      <SubscriptionsScreen navigation={navigation as never} route={{} as never} />
    );
    await waitFor(() => expect(screen.getByTestId('header-search')).toBeTruthy());
    fireEvent.press(screen.getByTestId('header-search'));
    expect(navigation.navigate).toHaveBeenCalledWith('Search');
  });

  it('skips navigate when channel_id is null', async () => {
    mockGetChannels.mockResolvedValue([
      {
        id: 2,
        channel_id: null,
        display_name: 'Orphan',
        channel_handle: null,
        channel_url: 'u',
        video_count: 0,
        title: null,
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: 't',
        updated_at: 't',
      },
    ]);
    render(
      <SubscriptionsScreen navigation={navigation as never} route={{} as never} />
    );
    await waitFor(() => expect(screen.getByText('Orphan')).toBeTruthy());
    fireEvent.press(screen.getByText('Orphan'));
    expect(navigation.navigate).not.toHaveBeenCalledWith('Channel', expect.anything());
  });

  it('does not load while database is not ready', () => {
    mockUseDatabase.mockReturnValue({ ready: false });
    render(
      <SubscriptionsScreen navigation={navigation as never} route={{} as never} />
    );
    expect(screen.getByText('Carregando inscrições…')).toBeTruthy();
    expect(mockGetChannels).not.toHaveBeenCalled();
  });

  it('falls back to handle, url and zero video count', async () => {
    mockGetChannels.mockResolvedValue([
      {
        id: 3,
        channel_id: 'UC3',
        display_name: null,
        channel_handle: '@handle',
        channel_url: 'https://youtube.com/@handle',
        video_count: null,
        title: null,
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: 't',
        updated_at: 't',
      },
      {
        id: 4,
        channel_id: 'UC4',
        display_name: null,
        channel_handle: null,
        channel_url: 'https://youtube.com/c/x',
        video_count: undefined,
        title: null,
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: 't',
        updated_at: 't',
      },
    ]);
    render(
      <SubscriptionsScreen navigation={navigation as never} route={{} as never} />
    );
    await waitFor(() => expect(screen.getAllByText('@handle').length).toBeGreaterThan(0));
    expect(screen.getAllByText('0 vídeos').length).toBe(2);
    expect(screen.getByText('Canal')).toBeTruthy();
    fireEvent.press(screen.getByText('Canal'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC4',
      channelName: 'Canal',
    });
    fireEvent.press(screen.getAllByText('@handle')[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC3',
      channelName: '@handle',
    });
  });

  it('ignores channel results after unmount', async () => {
    let resolveChannels: (value: unknown[]) => void = () => undefined;
    mockGetChannels.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChannels = resolve;
        })
    );
    const { unmount } = render(
      <SubscriptionsScreen navigation={navigation as never} route={{} as never} />
    );
    unmount();
    await act(async () => {
      resolveChannels([]);
    });
  });
});
