const React = require('react');
const { View } = require('react-native');

const inset = { top: 0, right: 0, bottom: 0, left: 0 };
const frame = { x: 0, y: 0, width: 390, height: 844 };

const SafeAreaInsetsContext = React.createContext(inset);
const SafeAreaFrameContext = React.createContext(frame);

function SafeAreaProvider({ children }) {
  return React.createElement(
    SafeAreaInsetsContext.Provider,
    { value: inset },
    React.createElement(SafeAreaFrameContext.Provider, { value: frame }, children)
  );
}

function SafeAreaView({ children, ...props }) {
  return React.createElement(View, props, children);
}

function useSafeAreaInsets() {
  return React.useContext(SafeAreaInsetsContext) ?? inset;
}

function useSafeAreaFrame() {
  return React.useContext(SafeAreaFrameContext) ?? frame;
}

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  useSafeAreaInsets,
  useSafeAreaFrame,
  initialWindowMetrics: { insets: inset, frame },
};
