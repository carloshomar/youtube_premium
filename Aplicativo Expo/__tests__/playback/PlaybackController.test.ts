import {
  PlaybackController,
  playbackController,
} from '../../src/playback/PlaybackController';

function mockHandle() {
  return {
    play: jest.fn(),
    pause: jest.fn(),
  };
}

describe('PlaybackController', () => {
  let controller: PlaybackController;

  beforeEach(() => {
    controller = new PlaybackController();
  });

  it('claims exclusive playback and pauses others', () => {
    const a = mockHandle();
    const b = mockHandle();
    controller.register('a', a);
    controller.register('b', b);

    controller.claim('a');
    expect(controller.getActiveId()).toBe('a');
    expect(a.play).toHaveBeenCalledTimes(1);
    expect(b.pause).toHaveBeenCalledTimes(1);
    expect(b.play).not.toHaveBeenCalled();

    controller.claim('b');
    expect(controller.getActiveId()).toBe('b');
    expect(a.pause).toHaveBeenCalled();
    expect(b.play).toHaveBeenCalledTimes(1);
  });

  it('release pauses only the given session', () => {
    const a = mockHandle();
    const b = mockHandle();
    controller.register('a', a);
    controller.register('b', b);
    controller.claim('a');

    controller.release('a');
    expect(controller.getActiveId()).toBeNull();
    expect(a.pause).toHaveBeenCalled();
    expect(b.play).not.toHaveBeenCalled();
  });

  it('unregister clears active id without requiring pause on disposed players', () => {
    const a = mockHandle();
    a.pause.mockImplementation(() => {
      throw new Error('native gone');
    });
    controller.register('a', a);
    controller.claim('a');
    expect(() => controller.unregister('a')).not.toThrow();
    expect(controller.getActiveId()).toBeNull();
    // Unregister no longer calls pause — native teardown owns that.
    expect(a.pause).not.toHaveBeenCalled();
  });

  it('claim and pauseAll swallow native play/pause failures', () => {
    const a = mockHandle();
    const b = mockHandle();
    a.pause.mockImplementation(() => {
      throw new Error('native gone');
    });
    b.play.mockImplementation(() => {
      throw new Error('native gone');
    });
    controller.register('a', a);
    controller.register('b', b);
    expect(() => controller.claim('b')).not.toThrow();
    expect(() => controller.pauseAll()).not.toThrow();
  });

  it('pauseAll stops every registered player', () => {
    const a = mockHandle();
    const b = mockHandle();
    controller.register('a', a);
    controller.register('b', b);
    controller.claim('b');
    controller.pauseAll();
    expect(controller.getActiveId()).toBeNull();
    expect(a.pause).toHaveBeenCalled();
    expect(b.pause).toHaveBeenCalled();
  });

  it('release of inactive session does not clear another active id', () => {
    const a = mockHandle();
    const b = mockHandle();
    controller.register('a', a);
    controller.register('b', b);
    controller.claim('a');
    controller.release('b');
    expect(controller.getActiveId()).toBe('a');
  });

  it('claim without registered handle still sets active id', () => {
    expect(() => controller.claim('ghost')).not.toThrow();
    expect(controller.getActiveId()).toBe('ghost');
  });

  it('singleton resets for isolation', () => {
    const handle = mockHandle();
    playbackController.register('x', handle);
    playbackController.claim('x');
    expect(playbackController.getActiveId()).toBe('x');
    playbackController.reset();
    expect(playbackController.getActiveId()).toBeNull();
  });
});
