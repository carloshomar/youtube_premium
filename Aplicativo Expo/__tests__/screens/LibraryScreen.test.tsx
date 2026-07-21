import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';

const mockUseDatabase = jest.fn();
const mockGetHistoryIds = jest.fn();
const mockGetVideoById = jest.fn();
const mockClearHistory = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return require('../helpers/navigationMock').withFocusEffect(actual);
});

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => mockUseDatabase(),
}));

jest.mock('../../src/data/history', () => ({
  getHistoryIds: (...args: unknown[]) => mockGetHistoryIds(...args),
  clearHistory: (...args: unknown[]) => mockClearHistory(...args),
}));

jest.mock('../../src/data/videos', () => ({
  getVideoById: (...args: unknown[]) => mockGetVideoById(...args),
}));

import LibraryScreen from '../../src/screens/LibraryScreen';

describe('LibraryScreen', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    mockUseDatabase.mockReturnValue({ ready: true });
    mockGetHistoryIds.mockResolvedValue(['v1']);
    mockGetVideoById.mockResolvedValue(
      makeVideo({ video_id: 'v1', title: 'Histórico 1', channel_id: 'UC1' })
    );
    mockClearHistory.mockResolvedValue(undefined);
  });

  it('shows history and opens player/channel', async () => {
    render(<LibraryScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByText('Histórico 1')).toBeTruthy());

    fireEvent.press(screen.getByTestId('video-card-v1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Player', { videoId: 'v1' });

    fireEvent.press(screen.getByTestId('video-card-channel-v1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC1',
      channelName: 'Canal Teste',
    });
  });

  it('clears history', async () => {
    render(<LibraryScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByText('Limpar')).toBeTruthy());
    fireEvent.press(screen.getByText('Limpar'));
    await waitFor(() =>
      expect(
        screen.getByText('Assista a um vídeo para ver o histórico aqui')
      ).toBeTruthy()
    );
    expect(mockClearHistory).toHaveBeenCalled();
  });

  it('skips channel navigate when history item has no channel_id', async () => {
    mockGetHistoryIds.mockResolvedValue(['v2']);
    mockGetVideoById.mockResolvedValue(
      makeVideo({ video_id: 'v2', title: 'Sem canal', channel_id: null })
    );
    render(<LibraryScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByText('Sem canal')).toBeTruthy());
    fireEvent.press(screen.getByTestId('video-card-channel-v2'));
    expect(navigation.navigate).not.toHaveBeenCalledWith('Channel', expect.anything());
  });

  it('skips missing history videos', async () => {
    mockGetHistoryIds.mockResolvedValue(['gone']);
    mockGetVideoById.mockResolvedValue(null);
    render(<LibraryScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() =>
      expect(
        screen.getByText('Assista a um vídeo para ver o histórico aqui')
      ).toBeTruthy()
    );
  });

  it('does not load while database is not ready', () => {
    mockUseDatabase.mockReturnValue({ ready: false });
    render(<LibraryScreen navigation={navigation as never} route={{} as never} />);
    expect(screen.getByText('Carregando biblioteca…')).toBeTruthy();
    expect(mockGetHistoryIds).not.toHaveBeenCalled();
  });

  it('opens search from library header', async () => {
    render(<LibraryScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByTestId('header-search')).toBeTruthy());
    fireEvent.press(screen.getByTestId('header-search'));
    expect(navigation.navigate).toHaveBeenCalledWith('Search');
  });

  it('navigates with undefined channelName when channel is null', async () => {
    mockGetHistoryIds.mockResolvedValue(['v3']);
    mockGetVideoById.mockResolvedValue(
      makeVideo({ video_id: 'v3', title: 'Canal vazio', channel_id: 'UC3', channel: null })
    );
    render(<LibraryScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() => expect(screen.getByText('Canal vazio')).toBeTruthy());
    fireEvent.press(screen.getByTestId('video-card-channel-v3'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC3',
      channelName: undefined,
    });
  });
});
