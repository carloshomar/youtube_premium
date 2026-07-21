import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';

const mockSearchVideos = jest.fn();

jest.mock('../../src/data/videos', () => ({
  searchVideos: (...args: unknown[]) => mockSearchVideos(...args),
}));

import SearchScreen from '../../src/screens/SearchScreen';

describe('SearchScreen', () => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    navigation.goBack.mockReset();
    navigation.navigate.mockReset();
    mockSearchVideos.mockResolvedValue([
      makeVideo({ video_id: 'hit', title: 'Resultado IA', channel_id: 'UC1' }),
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('searches and opens player/channel', async () => {
    render(
      <SearchScreen navigation={navigation as never} route={{} as never} />
    );

    fireEvent.changeText(screen.getByTestId('search-input'), 'IA');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('Resultado IA')).toBeTruthy());
    expect(mockSearchVideos).toHaveBeenCalledWith('IA');

    fireEvent.press(screen.getByTestId('video-card-hit'));
    expect(navigation.navigate).toHaveBeenCalledWith('Player', { videoId: 'hit' });

    fireEvent.press(screen.getByTestId('video-card-channel-hit'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC1',
      channelName: 'Canal Teste',
    });
  });

  it('clears query and shows empty hint', async () => {
    mockSearchVideos.mockResolvedValue([]);
    render(
      <SearchScreen navigation={navigation as never} route={{} as never} />
    );

    fireEvent.changeText(screen.getByTestId('search-input'), 'zzz');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('Nenhum resultado')).toBeTruthy());

    fireEvent.press(screen.getByTestId('icon-X'));
    expect(screen.getByTestId('search-input').props.value).toBe('');
  });

  it('goes back', async () => {
    render(
      <SearchScreen navigation={navigation as never} route={{} as never} />
    );
    fireEvent.press(screen.getByTestId('search-back'));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('shows Buscando while request is in flight', async () => {
    let resolveSearch: (value: ReturnType<typeof makeVideo>[]) => void = () => undefined;
    mockSearchVideos.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        })
    );
    render(<SearchScreen navigation={navigation as never} route={{} as never} />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'IA');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByText('Buscando…')).toBeTruthy();
    await act(async () => {
      resolveSearch([makeVideo({ video_id: 'hit', title: 'Resultado IA' })]);
    });
    await waitFor(() => expect(screen.getByText('Resultado IA')).toBeTruthy());
  });

  it('skips channel navigation without channel_id and passes undefined channelName', async () => {
    mockSearchVideos.mockResolvedValue([
      makeVideo({ video_id: 'hit', title: 'Sem canal', channel_id: null }),
      makeVideo({
        video_id: 'hit2',
        title: 'Canal null',
        channel_id: 'UC9',
        channel: null,
      }),
    ]);
    render(<SearchScreen navigation={navigation as never} route={{} as never} />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'x');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(screen.getByText('Sem canal')).toBeTruthy());
    fireEvent.press(screen.getByTestId('video-card-channel-hit'));
    expect(navigation.navigate).not.toHaveBeenCalledWith('Channel', expect.anything());

    fireEvent.press(screen.getByTestId('video-card-channel-hit2'));
    expect(navigation.navigate).toHaveBeenCalledWith('Channel', {
      channelId: 'UC9',
      channelName: undefined,
    });
  });
});
