import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  initializeDatabases,
  refreshDatabases,
  subscribeDatabasesReopened,
} from '../data/db';

type DatabaseContextValue = {
  ready: boolean;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  dbGeneration: number;
  refresh: () => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbGeneration, setDbGeneration] = useState(0);

  useEffect(() => {
    return subscribeDatabasesReopened((generation) => {
      setDbGeneration(generation);
    });
  }, []);

  const boot = useCallback(async (force = false) => {
    setError(null);
    if (force) {
      setSyncing(true);
    } else {
      setLoading(true);
    }
    try {
      if (force) {
        await refreshDatabases();
      } else {
        await initializeDatabases(false);
      }
      setReady(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao carregar dados';
      setError(message);
      setReady((wasReady) => (wasReady ? true : false));
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void boot(false);
  }, [boot]);

  const value = useMemo(
    () => ({
      ready,
      loading,
      syncing,
      error,
      dbGeneration,
      refresh: () => boot(true),
    }),
    [ready, loading, syncing, error, dbGeneration, boot]
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return ctx;
}
