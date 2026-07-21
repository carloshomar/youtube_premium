/**
 * End-to-end style flows at the JS layer: full App tree with mocked data plane.
 * Complements Maestro device flows under e2e/maestro/.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeVideo } from '../helpers/fixtures';

const mockInitializeDatabases = jest.fn();
const mockRefreshDatabases = jest.fn();
const mockGetVideos = jest.fn();
const mockGetShortVideos = jest.fn();
const mockGetAllCategories = jest.fn();
const mockSearchVideos = jest.fn();
const mockGetVideoById = jest.fn();
const mockGetRelatedVideos = jest.fn();
const mockAddToHistory = jest.fn();
const mockGetChannels = jest.fn();
const mockGetHistoryIds = jest.fn();

jest.mock('../../src/data/db', () => ({
  initializeDatabases: (...args: unknown[]) => mockInitializeDatabases(...args),
  refreshDatabases: (...args: unknown[]) => mockRefreshDatabases(...args),
  getVideosDb: jest.fn(),
  getChannelsDb: jest.fn(),
  subscribeDatabasesReopened: () => () => undefined,
  getDbGeneration: () => 0,
}));

jest.mock('../../src/data/videos', () => ({
  getVideos: (...args: unknown[]) => mockGetVideos(...args),
  getHomeFeed: (...args: unknown[]) => mockGetVideos(...args),
  getShortVideos: (...args: unknown[]) => mockGetShortVideos(...args),
  getAllCategories: (...args: unknown[]) => mockGetAllCategories(...args),
  searchVideos: (...args: unknown[]) => mockSearchVideos(...args),
  getVideoById: (...args: unknown[]) => mockGetVideoById(...args),
  getRelatedVideos: (...args: unknown[]) => mockGetRelatedVideos(...args),
  getVideosByChannel: jest.fn(async () => []),
}));

jest.mock('../../src/data/channels', () => ({
  getChannels: (...args: unknown[]) => mockGetChannels(...args),
  getChannelById: jest.fn(async () => null),
}));

jest.mock('../../src/data/history', () => ({
  addToHistory: (...args: unknown[]) => mockAddToHistory(...args),
  getHistoryIds: (...args: unknown[]) => mockGetHistoryIds(...args),
  clearHistory: jest.fn(),
}));

import App from '../../App';

describe('App E2E (JS integration)', () => {
  beforeEach(() => {
    mockInitializeDatabases.mockResolvedValue(undefined);
    mockRefreshDatabases.mockResolvedValue(undefined);
    mockGetAllCategories.mockResolvedValue(['Todos', 'Education']);
    mockGetVideos.mockResolvedValue([
      makeVideo({ video_id: 'e2e-1', title: 'E2E Home Video', channel_id: 'UC1' }),
    ]);
    mockGetShortVideos.mockResolvedValue([]);
    mockSearchVideos.mockResolvedValue([
      makeVideo({ video_id: 'e2e-1', title: 'E2E Home Video', channel_id: 'UC1' }),
    ]);
    mockGetVideoById.mockResolvedValue(
      makeVideo({
        video_id: 'e2e-1',
        title: 'E2E Home Video',
        mp4_sas_url: 'https://cdn/e2e.mp4',
        channel_id: 'UC1',
      })
    );
    mockGetRelatedVideos.mockResolvedValue([]);
    mockAddToHistory.mockResolvedValue(undefined);
    mockGetChannels.mockResolvedValue([
      {
        id: 1,
        channel_id: 'UC1',
        display_name: 'Canal E2E',
        channel_handle: '@e2e',
        channel_url: 'u',
        video_count: 1,
        title: null,
        enabled: 1,
        limit_videos: 5,
        last_checked_at: null,
        last_error: null,
        created_at: 't',
        updated_at: 't',
      },
    ]);
    mockGetHistoryIds.mockResolvedValue([]);
  });

  it('boots home feed from sqlite layer and opens player', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText('E2E Home Video')).toBeTruthy());
    expect(mockInitializeDatabases).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('video-card-e2e-1'));
    await waitFor(() => expect(screen.getByTestId('video-view')).toBeTruthy());
    expect(mockAddToHistory).toHaveBeenCalledWith('e2e-1');
  });

  it('navigates Home -> Search', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('header-search')).toBeTruthy());
    fireEvent.press(screen.getByTestId('header-search'));
    await waitFor(() => expect(screen.getByTestId('search-input')).toBeTruthy());
  });

  it('opens Inscrições tab', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Inscrições')).toBeTruthy());
    fireEvent.press(screen.getByText('Inscrições'));
    await waitFor(() => expect(screen.getByText('Canal E2E')).toBeTruthy());
  });
});
