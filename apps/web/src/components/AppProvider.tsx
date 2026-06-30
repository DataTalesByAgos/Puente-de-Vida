'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { initCrypto, resetCrypto } from '@/lib/crypto';
import { startAutoSync, syncNow } from '@/lib/sync';

interface AppState {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  triggerSync: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const pendingCount = useLiveQuery(() => db.reports.where('synced').equals(0).count(), [], 0) ?? 0;

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await syncNow();
      if (res) setLastSyncAt(new Date().toISOString());
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Initialize crypto if already logged in
    const token = sessionStorage.getItem('admin_token');
    if (token) initCrypto(token).catch(() => {});

    const authHandler = () => {
      const t = sessionStorage.getItem('admin_token');
      if (t) initCrypto(t).catch(() => {});
      else resetCrypto();
    };
    window.addEventListener('admin-auth-change', authHandler);

    const stop = startAutoSync();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('admin-auth-change', authHandler);
      stop();
    };
  }, []);

  return (
    <AppContext.Provider value={{ online, syncing, pendingCount, lastSyncAt, triggerSync }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
