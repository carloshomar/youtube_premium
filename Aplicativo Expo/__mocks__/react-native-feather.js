const React = require('react');
const { Text } = require('react-native');

function icon(name) {
  return function Icon(props) {
    return React.createElement(Text, { testID: props.testID ?? `icon-${name}` }, name);
  };
}

module.exports = {
  Home: icon('Home'),
  Film: icon('Film'),
  Youtube: icon('Youtube'),
  Clock: icon('Clock'),
  Search: icon('Search'),
  ArrowLeft: icon('ArrowLeft'),
  ChevronLeft: icon('ChevronLeft'),
  ChevronDown: icon('ChevronDown'),
  Play: icon('Play'),
  PlayCircle: icon('PlayCircle'),
  X: icon('X'),
  ThumbsUp: icon('ThumbsUp'),
  ThumbsDown: icon('ThumbsDown'),
};
