import { useEffect } from 'react';
import { playbackController, type PlaybackHandle } from './PlaybackController';

function safePause(player: PlaybackHandle): void {
  try {
    player.pause();
  } catch {
    // Native VideoPlayer may already be disposed during unmount.
  }
}

/**
 * Registers a player and keeps exclusive play/pause in sync with `shouldPlay`.
 */
export function useExclusivePlayback(
  sessionId: string,
  player: PlaybackHandle,
  shouldPlay: boolean
): void {
  useEffect(() => {
    playbackController.register(sessionId, player);
    return () => {
      safePause(player);
      playbackController.unregister(sessionId);
    };
  }, [sessionId, player]);

  useEffect(() => {
    if (shouldPlay) {
      playbackController.claim(sessionId);
    } else {
      playbackController.release(sessionId);
    }
  }, [sessionId, shouldPlay]);
}
