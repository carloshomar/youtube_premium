import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';

const mockMaximize = jest.fn();
const mockNavigate = jest.fn();

const mockFloatingState: {
  mode: 'hidden' | 'fullscreen' | 'mini';
  video: ReturnType<typeof makeVideo> | null;
} = {
  mode: 'mini',
  video: makeVideo({
    video_id: 'mini-1',
    title: 'Mini player video',
    mp4_sas_url: 'https://cdn/mini.mp4',
    width: 640,
    height: 360,
  }),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../src/context/FloatingPlayerContext', () => ({
  useFloatingPlayer: () => ({
    get mode() {
      return mockFloatingState.mode;
    },
    get video() {
      return mockFloatingState.video;
    },
    player: require('../../__mocks__/expo-video').__mockPlayer,
    maximize: mockMaximize,
  }),
}));

import FloatingMiniPlayer from '../../src/components/FloatingMiniPlayer';

describe('FloatingMiniPlayer', () => {
  beforeEach(() => {
    mockMaximize.mockClear();
    mockNavigate.mockClear();
    mockFloatingState.mode = 'mini';
    mockFloatingState.video = makeVideo({
      video_id: 'mini-1',
      title: 'Mini player video',
      mp4_sas_url: 'https://cdn/mini.mp4',
      width: 640,
      height: 360,
    });
  });

  it('renders mini player and expands on tap', () => {
    render(<FloatingMiniPlayer />);
    expect(screen.getByTestId('floating-mini-player')).toBeTruthy();
    expect(screen.getByText('Mini player video')).toBeTruthy();

    fireEvent.press(screen.getByTestId('floating-mini-player-expand'));
    expect(mockMaximize).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Player', { videoId: 'mini-1' });
  });

  it('returns null when not in mini mode', () => {
    mockFloatingState.mode = 'hidden';
    render(<FloatingMiniPlayer />);
    expect(screen.queryByTestId('floating-mini-player')).toBeNull();
  });

  it('returns null without video', () => {
    mockFloatingState.video = null;
    render(<FloatingMiniPlayer />);
    expect(screen.queryByTestId('floating-mini-player')).toBeNull();
  });

  it('shows placeholder without mp4 and falls back title', () => {
    mockFloatingState.video = makeVideo({
      video_id: 'mini-2',
      title: '',
      mp4_sas_url: null,
    });
    render(<FloatingMiniPlayer />);
    expect(screen.getByText('Sem vídeo')).toBeTruthy();
    expect(screen.getByText('Vídeo')).toBeTruthy();
  });
});
