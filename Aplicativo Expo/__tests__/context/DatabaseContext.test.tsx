import React from 'react';
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';

const mockInitializeDatabases = jest.fn();
const mockRefreshDatabases = jest.fn();

jest.mock('../../src/data/db', () => ({
  initializeDatabases: (...args: unknown[]) => mockInitializeDatabases(...args),
  refreshDatabases: (...args: unknown[]) => mockRefreshDatabases(...args),
  subscribeDatabasesReopened: (listener: (generation: number) => void) => {
    listener(0);
    return () => undefined;
  },
}));

import { DatabaseProvider, useDatabase } from '../../src/context/DatabaseContext';

function Probe() {
  const { ready, loading, syncing, error, dbGeneration, refresh } = useDatabase();
  return (
    <>
      <Text testID="ready">{String(ready)}</Text>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="syncing">{String(syncing)}</Text>
      <Text testID="generation">{String(dbGeneration)}</Text>
      <Text testID="error">{error ?? ''}</Text>
      <Text testID="refresh" onPress={() => void refresh()}>
        refresh
      </Text>
    </>
  );
}

describe('DatabaseProvider', () => {
  beforeEach(() => {
    mockInitializeDatabases.mockReset();
    mockRefreshDatabases.mockReset();
  });

  it('boots successfully and exposes ready state', async () => {
    mockInitializeDatabases.mockResolvedValue(undefined);

    render(
      <DatabaseProvider>
        <Probe />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ready').props.children).toBe('true');
    });
    expect(screen.getByTestId('loading').props.children).toBe('false');
    expect(screen.getByTestId('error').props.children).toBe('');
    expect(mockInitializeDatabases).toHaveBeenCalledWith(false);
  });

  it('refresh path uses refreshDatabases while initial boot uses initializeDatabases', async () => {
    mockInitializeDatabases.mockResolvedValue(undefined);
    mockRefreshDatabases.mockResolvedValue(undefined);

    render(
      <DatabaseProvider>
        <Probe />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(mockInitializeDatabases).toHaveBeenCalledWith(false);
    });

    await act(async () => {
      screen.getByTestId('refresh').props.onPress();
    });

    await waitFor(() => {
      expect(mockRefreshDatabases).toHaveBeenCalled();
    });
  });

  it('surfaces errors and keeps ready=false', async () => {
    mockInitializeDatabases.mockRejectedValue(new Error('falha sqlite'));

    render(
      <DatabaseProvider>
        <Probe />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error').props.children).toBe('falha sqlite');
    });
    expect(screen.getByTestId('ready').props.children).toBe('false');
  });

  it('maps non-Error throws to fallback message', async () => {
    mockInitializeDatabases.mockRejectedValue('oops');

    render(
      <DatabaseProvider>
        <Probe />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error').props.children).toBe('Falha ao carregar dados');
    });
  });

  it('refresh() calls refreshDatabases', async () => {
    mockInitializeDatabases.mockResolvedValue(undefined);
    mockRefreshDatabases.mockResolvedValue(undefined);

    render(
      <DatabaseProvider>
        <Probe />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ready').props.children).toBe('true');
    });

    await act(async () => {
      screen.getByTestId('refresh').props.onPress();
    });

    await waitFor(() => {
      expect(mockRefreshDatabases).toHaveBeenCalled();
    });
  });

  it('useDatabase throws outside provider', () => {
    expect(() => render(<Probe />)).toThrow(
      'useDatabase must be used within DatabaseProvider'
    );
  });
});
