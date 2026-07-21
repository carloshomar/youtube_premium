export type PlaybackHandle = {
  play: () => void;
  pause: () => void;
};

/**
 * expo-video players throw if pause/play runs after the native shared object
 * is already released (common during React unmount / Shorts swipe).
 */
function safeInvoke(action: () => void): void {
  try {
    action();
  } catch {
    // Native player already disposed — ignore.
  }
}

/**
 * Ensures only one video session is playing at a time (YTube-like).
 * Screens register players and claim/release exclusive playback.
 */
export class PlaybackController {
  private activeId: string | null = null;
  private handles = new Map<string, PlaybackHandle>();

  register(id: string, handle: PlaybackHandle): void {
    this.handles.set(id, handle);
  }

  unregister(id: string): void {
    // Drop the handle first so we never call into a disposed native player
    // from another claim/pauseAll during the same teardown frame.
    this.handles.delete(id);
    if (this.activeId === id) {
      this.activeId = null;
    }
  }

  /** Pause every other session and play this one. */
  claim(id: string): void {
    for (const [otherId, handle] of this.handles) {
      if (otherId !== id) {
        safeInvoke(() => handle.pause());
      }
    }
    this.activeId = id;
    safeInvoke(() => this.handles.get(id)?.play());
  }

  release(id: string): void {
    safeInvoke(() => this.handles.get(id)?.pause());
    if (this.activeId === id) {
      this.activeId = null;
    }
  }

  pauseAll(): void {
    for (const handle of this.handles.values()) {
      safeInvoke(() => handle.pause());
    }
    this.activeId = null;
  }

  getActiveId(): string | null {
    return this.activeId;
  }

  /** Test helper — clears all sessions. */
  reset(): void {
    this.handles.clear();
    this.activeId = null;
  }
}

export const playbackController = new PlaybackController();
