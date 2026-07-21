const React = require('react');
const { View, Text } = require('react-native');

const listeners = new Map();

function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const handler of set) {
    handler(payload);
  }
}

const mockPlayer = {
  loop: false,
  muted: false,
  staysActiveInBackground: false,
  showNowPlayingNotification: false,
  bufferOptions: {},
  replace: jest.fn(),
  replaceAsync: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  addListener: jest.fn((event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return {
      remove: () => {
        listeners.get(event)?.delete(handler);
      },
    };
  }),
  removeListener: jest.fn((event, handler) => {
    listeners.get(event)?.delete(handler);
  }),
};

module.exports = {
  useVideoPlayer: jest.fn((_source, setup) => {
    if (typeof setup === 'function') setup(mockPlayer);
    return mockPlayer;
  }),
  VideoView: ({ testID }) =>
    React.createElement(
      View,
      { testID: testID ?? 'video-view' },
      React.createElement(Text, null, 'video')
    ),
  useEventListener: jest.fn(),
  __mockPlayer: mockPlayer,
  __emitPlayerEvent: emit,
  __resetPlayerListeners: () => listeners.clear(),
};
