import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('../../src/screens/HomeScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement(Text, null, 'HomeScreenMock'),
  };
});
jest.mock('../../src/screens/ShortsScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement(Text, null, 'ShortsScreenMock'),
  };
});
jest.mock('../../src/screens/MusicScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement(Text, null, 'MusicScreenMock'),
  };
});
jest.mock('../../src/screens/SubscriptionsScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement(Text, null, 'SubscriptionsScreenMock'),
  };
});
jest.mock('../../src/screens/LibraryScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement(Text, null, 'LibraryScreenMock'),
  };
});
jest.mock('../../src/screens/SearchScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement(Text, null, 'SearchScreenMock'),
  };
});
jest.mock('../../src/screens/PlayerScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement(Text, null, 'PlayerScreenMock'),
  };
});
jest.mock('../../src/screens/ChannelScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement(Text, null, 'ChannelScreenMock'),
  };
});

jest.mock('../../src/context/DatabaseContext', () => ({
  useDatabase: () => ({ ready: true, loading: false, error: null, refresh: jest.fn() }),
}));

import AppNavigation from '../../src/navigation/AppNavigation';

describe('AppNavigation', () => {
  it('boots on Home tab', () => {
    render(<AppNavigation />);
    expect(screen.getByText('HomeScreenMock')).toBeTruthy();
    expect(screen.getByText('Início')).toBeTruthy();
  });
});
