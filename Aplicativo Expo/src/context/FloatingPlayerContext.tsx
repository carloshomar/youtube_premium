import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import { useDatabase } from './DatabaseContext';
import { addToHistory } from '../data/history';
import { getRelatedVideos, getVideoById } from '../data/videos';
import type { VideoRow } from '../data/types';
import { useExclusivePlayback } from '../playback/useExclusivePlayback';

export type FloatingPlayerMode = 'hidden' | 'fullscreen' | 'mini';

type PrepareOptions = {
  /** Keep the current up-next queue (already trimmed by the caller). */
  preserveQueue?: boolean;
};

type FloatingPlayerContextValue = {
  mode: FloatingPlayerMode;
  video: VideoRow | null;
  player: VideoPlayer;
  loading: boolean;
  /** Remaining autoplay queue — same list shown as "Próximos". */
  upNext: VideoRow[];
  prepareVideo: (videoId: string, options?: PrepareOptions) => Promise<void>;
  /** Play an item from the queue and drop it (and earlier items) from Próximos. */
  playFromUpNext: (videoId: string) => Promise<void>;
  /** Drop video ids from the current up-next queue (e.g. after dislike). */
  removeFromUpNext: (videoIds: Iterable<string>) => void;
  minimize: () => void;
  maximize: () => void;
  dismiss: () => void;
  setPlayerScreenFocused: (focused: boolean) => void;
};

const FloatingPlayerContext = createContext<FloatingPlayerContextValue | null>(null);

function setQueue(
  next: VideoRow[],
  upNextRef: React.MutableRefObject<VideoRow[]>,
  setUpNext: React.Dispatch<React.SetStateAction<VideoRow[]>>
) {
  upNextRef.current = next;
  setUpNext(next);
}

export function FloatingPlayerProvider({ children }: { children: ReactNode }) {
  const { ready } = useDatabase();
  const [mode, setMode] = useState<FloatingPlayerMode>('hidden');
  const [video, setVideo] = useState<VideoRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [upNext, setUpNext] = useState<VideoRow[]>([]);
  const [playerScreenFocused, setPlayerScreenFocused] = useState(false);
  const loadingRef = useRef(false);
  const upNextRef = useRef<VideoRow[]>([]);
  const preserveQueueRef = useRef(false);
  const videoRef = useRef<VideoRow | null>(null);
  const modeRef = useRef<FloatingPlayerMode>('hidden');
  const prepareGenerationRef = useRef(0);
  const prepareVideoRef = useRef<(videoId: string, options?: PrepareOptions) => Promise<void>>(
    async () => undefined
  );

  videoRef.current = video;
  modeRef.current = mode;

  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
    p.staysActiveInBackground = true;
    p.showNowPlayingNotification = true;
  });

  const sessionId = video ? `player:${video.video_id}` : 'player:inactive';
  const shouldPlay =
    mode !== 'hidden' &&
    Boolean(video?.mp4_sas_url) &&
    !loading &&
    (mode === 'mini' || (mode === 'fullscreen' && playerScreenFocused));

  useExclusivePlayback(sessionId, player, shouldPlay);

  const prepareVideo = useCallback(
    async (videoId: string, options?: PrepareOptions) => {
      if (!ready) return;

      const preserveQueue = options?.preserveQueue ?? preserveQueueRef.current;
      preserveQueueRef.current = false;

      if (videoRef.current?.video_id === videoId) {
        return;
      }

      const generation = ++prepareGenerationRef.current;
      loadingRef.current = true;
      setLoading(true);
      try {
        const row = await getVideoById(videoId);
        // A newer prepare won the race — abandon this result.
        if (generation !== prepareGenerationRef.current) return;

        setVideo(row);
        if (row?.mp4_sas_url) {
          player.replace(row.mp4_sas_url);
          player.staysActiveInBackground = true;
          player.showNowPlayingNotification = true;
        }
        if (row) {
          await addToHistory(row.video_id);
          if (generation !== prepareGenerationRef.current) return;

          if (preserveQueue) {
            const remaining = upNextRef.current.filter((v) => v.video_id !== row.video_id);
            if (remaining.length > 0) {
              setQueue(remaining, upNextRef, setUpNext);
            } else {
              const related = await getRelatedVideos(row);
              if (generation !== prepareGenerationRef.current) return;
              setQueue(
                related.filter((v) => v.video_id !== row.video_id),
                upNextRef,
                setUpNext
              );
            }
          } else {
            const related = await getRelatedVideos(row);
            if (generation !== prepareGenerationRef.current) return;
            setQueue(
              related.filter((v) => v.video_id !== row.video_id),
              upNextRef,
              setUpNext
            );
          }
        } else {
          setQueue([], upNextRef, setUpNext);
        }
        if (modeRef.current === 'hidden') {
          setMode('fullscreen');
        }
      } finally {
        if (generation === prepareGenerationRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [ready, player]
  );

  prepareVideoRef.current = prepareVideo;

  const playFromUpNext = useCallback(
    async (videoId: string) => {
      const idx = upNextRef.current.findIndex((v) => v.video_id === videoId);
      if (idx >= 0) {
        // Skip items before the tap; remove the tapped item from the remaining queue.
        setQueue(upNextRef.current.slice(idx + 1), upNextRef, setUpNext);
        preserveQueueRef.current = true;
        await prepareVideo(videoId, { preserveQueue: true });
        return;
      }
      await prepareVideo(videoId);
    },
    [prepareVideo]
  );

  const removeFromUpNext = useCallback((videoIds: Iterable<string>) => {
    const blocked = new Set(videoIds);
    if (blocked.size === 0) return;
    setQueue(
      upNextRef.current.filter((v) => !blocked.has(v.video_id)),
      upNextRef,
      setUpNext
    );
  }, []);

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      if (loadingRef.current) return;
      const [next, ...rest] = upNextRef.current;
      if (!next) return;
      setQueue(rest, upNextRef, setUpNext);
      preserveQueueRef.current = true;
      void prepareVideoRef.current(next.video_id, { preserveQueue: true });
    });
    return () => {
      subscription.remove();
    };
  }, [player]);

  const minimize = useCallback(() => {
    setMode('mini');
  }, []);

  const maximize = useCallback(() => {
    if (videoRef.current) {
      setMode('fullscreen');
    }
  }, []);

  const dismiss = useCallback(() => {
    prepareGenerationRef.current += 1;
    setMode('hidden');
    setVideo(null);
    setQueue([], upNextRef, setUpNext);
    preserveQueueRef.current = false;
    setPlayerScreenFocused(false);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      video,
      player,
      loading,
      upNext,
      prepareVideo,
      playFromUpNext,
      removeFromUpNext,
      minimize,
      maximize,
      dismiss,
      setPlayerScreenFocused,
    }),
    [
      mode,
      video,
      player,
      loading,
      upNext,
      prepareVideo,
      playFromUpNext,
      removeFromUpNext,
      minimize,
      maximize,
      dismiss,
    ]
  );

  return (
    <FloatingPlayerContext.Provider value={value}>{children}</FloatingPlayerContext.Provider>
  );
}

export function useFloatingPlayer(): FloatingPlayerContextValue {
  const ctx = useContext(FloatingPlayerContext);
  if (!ctx) {
    throw new Error('useFloatingPlayer must be used within FloatingPlayerProvider');
  }
  return ctx;
}
