import React from 'react';
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';
import { playbackController } from '../../src/playback/PlaybackController';

const mockUseDatabase = jest.fn();
const mockGetVideoById = jest.fn();
const mockGetRelatedVideos = jest.fn();
const mockAddToHistory = jest.fn();

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => mockUseDatabase(),
}));

jest.mock('../../src/data/videos', () => ({
  getVideoById: (...args: unknown[]) => mockGetVideoById(...args),
  getRelatedVideos: (...args: unknown[]) => mockGetRelatedVideos(...args),
}));

jest.mock('../../src/data/history', () => ({
  addToHistory: (...args: unknown[]) => mockAddToHistory(...args),
}));

import {
  FloatingPlayerProvider,
  useFloatingPlayer,
} from '../../src/context/FloatingPlayerContext';

const {
  __mockPlayer: player,
  __emitPlayerEvent,
  __resetPlayerListeners,
} = require('../../__mocks__/expo-video');

function Probe({
  onReady,
}: {
  onReady: (api: ReturnType<typeof useFloatingPlayer>) => void;
}) {
  const api = useFloatingPlayer();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return <Text testID="floating-mode">{api.mode}</Text>;
}

describe('FloatingPlayerProvider', () => {
  let latest: ReturnType<typeof useFloatingPlayer> | null = null;
  const capture = (value: ReturnType<typeof useFloatingPlayer>) => {
    latest = value;
  };

  beforeEach(() => {
    latest = null;
    playbackController.reset();
    __resetPlayerListeners();
    mockUseDatabase.mockReturnValue({ ready: true });
    mockAddToHistory.mockReset().mockResolvedValue(undefined);
    mockGetVideoById.mockReset();
    mockGetRelatedVideos.mockReset();
    player.replace.mockClear();
    player.addListener.mockClear();
    mockGetRelatedVideos.mockResolvedValue([
      makeVideo({ video_id: 'next-1', title: 'Próximo', mp4_sas_url: 'https://cdn/n.mp4' }),
    ]);
    mockGetVideoById.mockResolvedValue(
      makeVideo({
        video_id: 'fp-1',
        title: 'Floating',
        mp4_sas_url: 'https://cdn/f.mp4',
      })
    );
  });

  afterEach(() => {
    playbackController.reset();
    __resetPlayerListeners();
  });

  it('throws outside provider', () => {
    expect(() => render(<Probe onReady={() => undefined} />)).toThrow(
      'useFloatingPlayer must be used within FloatingPlayerProvider'
    );
  });

  it('prepares video, plays in mini mode, maximizes and dismisses', async () => {
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );

    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });

    await waitFor(() => expect(latest!.video?.video_id).toBe('fp-1'));
    expect(mockGetVideoById).toHaveBeenCalledWith('fp-1');
    expect(player.replace).toHaveBeenCalledWith('https://cdn/f.mp4');
    expect(mockAddToHistory).toHaveBeenCalledWith('fp-1');
    expect(mockGetRelatedVideos).toHaveBeenCalled();
    expect(latest!.upNext[0]?.video_id).toBe('next-1');
    expect(latest!.mode).toBe('fullscreen');

    act(() => {
      latest!.setPlayerScreenFocused(true);
    });
    await waitFor(() => expect(playbackController.getActiveId()).toBe('player:fp-1'));

    act(() => {
      latest!.minimize();
      latest!.setPlayerScreenFocused(false);
    });
    await waitFor(() => expect(screen.getByTestId('floating-mode').props.children).toBe('mini'));
    await waitFor(() => expect(playbackController.getActiveId()).toBe('player:fp-1'));

    act(() => {
      latest!.maximize();
      latest!.setPlayerScreenFocused(true);
    });
    await waitFor(() => expect(latest!.mode).toBe('fullscreen'));

    act(() => {
      latest!.dismiss();
    });
    await waitFor(() => expect(latest!.mode).toBe('hidden'));
    expect(latest!.video).toBeNull();
    expect(latest!.upNext).toEqual([]);
    await waitFor(() => expect(playbackController.getActiveId()).toBeNull());
  });

  it('skips prepare when database is not ready', async () => {
    mockUseDatabase.mockReturnValue({ ready: false });
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });
    expect(mockGetVideoById).not.toHaveBeenCalled();
  });

  it('handles missing mp4 and keeps mode when already visible', async () => {
    mockGetVideoById.mockResolvedValue(
      makeVideo({
        video_id: 'fp-2',
        title: 'Sem mp4',
        mp4_sas_url: null,
      })
    );
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('fp-2');
    });
    await waitFor(() => expect(latest!.mode).toBe('fullscreen'));
    expect(player.replace).not.toHaveBeenCalled();

    player.replace.mockClear();
    mockGetVideoById.mockResolvedValue(
      makeVideo({
        video_id: 'fp-3',
        title: 'Outro',
        mp4_sas_url: 'https://cdn/g.mp4',
      })
    );
    await act(async () => {
      await latest!.prepareVideo('fp-3');
    });
    await waitFor(() => expect(latest!.video?.video_id).toBe('fp-3'));
    expect(latest!.mode).toBe('fullscreen');
    expect(player.replace).toHaveBeenCalledWith('https://cdn/g.mp4');
  });

  it('maximize is a no-op without video', async () => {
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    act(() => {
      latest!.maximize();
    });
    expect(latest!.mode).toBe('hidden');
  });

  it('does not reload source when preparing the same video again', async () => {
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });
    await waitFor(() => expect(latest!.video?.video_id).toBe('fp-1'));
    expect(player.replace).toHaveBeenCalledTimes(1);

    mockGetVideoById.mockClear();
    mockAddToHistory.mockClear();
    player.replace.mockClear();

    act(() => {
      latest!.minimize();
    });
    await waitFor(() => expect(latest!.mode).toBe('mini'));
    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });

    expect(mockGetVideoById).not.toHaveBeenCalled();
    expect(mockAddToHistory).not.toHaveBeenCalled();
    expect(player.replace).not.toHaveBeenCalled();
    expect(latest!.video?.video_id).toBe('fp-1');
    expect(latest!.mode).toBe('mini');
  });

  it('keeps fullscreen when preparing another video while already open', async () => {
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });
    await waitFor(() => expect(latest!.mode).toBe('fullscreen'));

    mockGetVideoById.mockResolvedValue(
      makeVideo({
        video_id: 'fp-2',
        title: 'Segundo',
        mp4_sas_url: 'https://cdn/h.mp4',
      })
    );
    await act(async () => {
      await latest!.prepareVideo('fp-2');
    });
    await waitFor(() => expect(latest!.video?.video_id).toBe('fp-2'));
    expect(latest!.mode).toBe('fullscreen');
  });

  it('does not play while fullscreen is unfocused', async () => {
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });
    act(() => {
      latest!.setPlayerScreenFocused(false);
    });
    await waitFor(() => expect(playbackController.getActiveId()).toBeNull());
  });

  it('skips history when prepared video row is null', async () => {
    mockGetVideoById.mockResolvedValue(null);
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('missing');
    });
    await waitFor(() => expect(latest!.loading).toBe(false));
    expect(mockAddToHistory).not.toHaveBeenCalled();
    expect(latest!.video).toBeNull();
    expect(latest!.upNext).toEqual([]);
    expect(latest!.mode).toBe('fullscreen');
  });

  it('autoplays the first upNext video on playToEnd', async () => {
    mockGetVideoById
      .mockResolvedValueOnce(
        makeVideo({
          video_id: 'fp-1',
          title: 'Floating',
          mp4_sas_url: 'https://cdn/f.mp4',
        })
      )
      .mockResolvedValueOnce(
        makeVideo({
          video_id: 'next-1',
          title: 'Próximo',
          mp4_sas_url: 'https://cdn/n.mp4',
        })
      );
    mockGetRelatedVideos
      .mockResolvedValueOnce([
        makeVideo({ video_id: 'next-1', title: 'Próximo', mp4_sas_url: 'https://cdn/n.mp4' }),
        makeVideo({ video_id: 'next-2', title: 'Depois', mp4_sas_url: 'https://cdn/n2.mp4' }),
      ])
      .mockResolvedValueOnce([]);

    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });
    await waitFor(() => expect(latest!.upNext.map((v) => v.video_id)).toEqual(['next-1', 'next-2']));

    await act(async () => {
      __emitPlayerEvent('playToEnd');
    });

    await waitFor(() => expect(latest!.video?.video_id).toBe('next-1'));
    expect(player.replace).toHaveBeenCalledWith('https://cdn/n.mp4');
    // Queue advances: next-1 consumed, next-2 remains (no full rebuild).
    expect(latest!.upNext.map((v) => v.video_id)).toEqual(['next-2']);
    expect(mockGetRelatedVideos).toHaveBeenCalledTimes(1);
  });

  it('playFromUpNext jumps in the queue and keeps the remaining fila', async () => {
    mockGetVideoById
      .mockResolvedValueOnce(
        makeVideo({
          video_id: 'fp-1',
          title: 'Floating',
          mp4_sas_url: 'https://cdn/f.mp4',
        })
      )
      .mockResolvedValueOnce(
        makeVideo({
          video_id: 'next-2',
          title: 'Depois',
          mp4_sas_url: 'https://cdn/n2.mp4',
        })
      );
    mockGetRelatedVideos.mockResolvedValue([
      makeVideo({ video_id: 'next-1', title: 'Próximo', mp4_sas_url: 'https://cdn/n.mp4' }),
      makeVideo({ video_id: 'next-2', title: 'Depois', mp4_sas_url: 'https://cdn/n2.mp4' }),
      makeVideo({ video_id: 'next-3', title: 'Terceiro', mp4_sas_url: 'https://cdn/n3.mp4' }),
    ]);

    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });
    await waitFor(() => expect(latest!.upNext).toHaveLength(3));

    await act(async () => {
      await latest!.playFromUpNext('next-2');
    });

    await waitFor(() => expect(latest!.video?.video_id).toBe('next-2'));
    expect(latest!.upNext.map((v) => v.video_id)).toEqual(['next-3']);
    expect(mockGetRelatedVideos).toHaveBeenCalledTimes(1);
  });

  it('keeps prepareVideo identity stable when the current video changes', async () => {
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    const firstPrepare = latest!.prepareVideo;

    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });
    await waitFor(() => expect(latest!.video?.video_id).toBe('fp-1'));

    expect(latest!.prepareVideo).toBe(firstPrepare);
  });

  it('ignores playToEnd when the upNext queue is empty', async () => {
    mockGetRelatedVideos.mockResolvedValue([]);
    render(
      <FloatingPlayerProvider>
        <Probe onReady={capture} />
      </FloatingPlayerProvider>
    );
    await waitFor(() => expect(latest).not.toBeNull());
    await act(async () => {
      await latest!.prepareVideo('fp-1');
    });
    await waitFor(() => expect(latest!.upNext).toEqual([]));
    mockGetVideoById.mockClear();

    await act(async () => {
      __emitPlayerEvent('playToEnd');
    });

    expect(mockGetVideoById).not.toHaveBeenCalled();
    expect(latest!.video?.video_id).toBe('fp-1');
  });
});
