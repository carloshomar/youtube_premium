import React, { useState } from 'react';
import { Text, Pressable } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { playbackController } from '../../src/playback/PlaybackController';
import { useExclusivePlayback } from '../../src/playback/useExclusivePlayback';

function Harness({
  sessionId,
  shouldPlay,
  player,
}: {
  sessionId: string;
  shouldPlay: boolean;
  player: { play: () => void; pause: () => void };
}) {
  useExclusivePlayback(sessionId, player, shouldPlay);
  return <Text>{sessionId}</Text>;
}

function ToggleHarness({
  sessionId,
  player,
}: {
  sessionId: string;
  player: { play: () => void; pause: () => void };
}) {
  const [playing, setPlaying] = useState(true);
  useExclusivePlayback(sessionId, player, playing);
  return (
    <Pressable testID="toggle" onPress={() => setPlaying((v) => !v)}>
      <Text>{playing ? 'on' : 'off'}</Text>
    </Pressable>
  );
}

describe('useExclusivePlayback', () => {
  beforeEach(() => {
    playbackController.reset();
  });

  afterEach(() => {
    playbackController.reset();
  });

  it('claims when shouldPlay is true and pauses safely on unmount', () => {
    const player = { play: jest.fn(), pause: jest.fn() };
    const { unmount } = render(
      <Harness sessionId="s1" shouldPlay player={player} />
    );
    expect(playbackController.getActiveId()).toBe('s1');
    expect(player.play).toHaveBeenCalled();

    unmount();
    expect(playbackController.getActiveId()).toBeNull();
    expect(player.pause).toHaveBeenCalled();
  });

  it('ignores pause errors when native player is already disposed', () => {
    const player = {
      play: jest.fn(),
      pause: jest.fn(() => {
        throw new Error('native gone');
      }),
    };
    const { unmount } = render(
      <Harness sessionId="s2" shouldPlay player={player} />
    );
    expect(() => unmount()).not.toThrow();
    expect(playbackController.getActiveId()).toBeNull();
  });

  it('switching claim pauses the previous session', () => {
    const a = { play: jest.fn(), pause: jest.fn() };
    const b = { play: jest.fn(), pause: jest.fn() };
    const { rerender } = render(
      <>
        <Harness sessionId="a" shouldPlay player={a} />
        <Harness sessionId="b" shouldPlay={false} player={b} />
      </>
    );

    expect(playbackController.getActiveId()).toBe('a');

    rerender(
      <>
        <Harness sessionId="a" shouldPlay={false} player={a} />
        <Harness sessionId="b" shouldPlay player={b} />
      </>
    );

    expect(playbackController.getActiveId()).toBe('b');
    expect(a.pause).toHaveBeenCalled();
    expect(b.play).toHaveBeenCalled();
  });

  it('toggles release and claim when shouldPlay flips', () => {
    const player = { play: jest.fn(), pause: jest.fn() };
    render(<ToggleHarness sessionId="t1" player={player} />);
    expect(playbackController.getActiveId()).toBe('t1');

    act(() => {
      fireEvent.press(screen.getByTestId('toggle'));
    });
    expect(playbackController.getActiveId()).toBeNull();
    expect(player.pause).toHaveBeenCalled();

    act(() => {
      fireEvent.press(screen.getByTestId('toggle'));
    });
    expect(playbackController.getActiveId()).toBe('t1');
  });
});
