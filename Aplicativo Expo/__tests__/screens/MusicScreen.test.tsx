import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';

const mockUseDatabase = jest.fn();
const mockGetMusicGenreFeed = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return require('../helpers/navigationMock').withFocusEffect(actual);
});

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => mockUseDatabase(),
}));

jest.mock('../../src/data/videos', () => ({
  getMusicGenreFeed: (...args: unknown[]) => mockGetMusicGenreFeed(...args),
}));

import MusicScreen from '../../src/screens/MusicScreen';

describe('MusicScreen', () => {
  const navigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    mockUseDatabase.mockReturnValue({ ready: true, dbGeneration: 0 });
    mockGetMusicGenreFeed.mockReset();
    navigation.navigate.mockClear();
  });

  it('lists one card per genre and opens the player', async () => {
    mockGetMusicGenreFeed.mockResolvedValue([
      {
        genreKey: 'phonk',
        genreLabel: 'phonk',
        listenScore: 4,
        relevance: 1,
        video: makeVideo({ video_id: 'p1', title: 'Phonk Hit', channel_id: 'UC1' }),
      },
      {
        genreKey: 'funk',
        genreLabel: 'funk',
        listenScore: 1,
        relevance: 1,
        video: makeVideo({ video_id: 'f1', title: 'Funk Hit', channel_id: 'UC2' }),
      },
    ]);

    render(<MusicScreen navigation={navigation as never} route={{} as never} />);

    await waitFor(() => expect(screen.getByTestId('music-genre-phonk')).toBeTruthy());
    expect(screen.getByText('Phonk Hit')).toBeTruthy();
    expect(screen.getByText('Funk Hit')).toBeTruthy();

    fireEvent.press(screen.getByTestId('video-card-p1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Player', { videoId: 'p1' });
  });

  it('shows empty state when feed is empty', async () => {
    mockGetMusicGenreFeed.mockResolvedValue([]);
    render(<MusicScreen navigation={navigation as never} route={{} as never} />);
    await waitFor(() =>
      expect(screen.getByText('Nenhuma música com gênero encontrada')).toBeTruthy()
    );
  });
});
