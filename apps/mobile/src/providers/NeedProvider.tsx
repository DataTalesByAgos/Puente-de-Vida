import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Need, NeedCategory, NeedStatus } from '@pdv/shared';
import { getLocalNeeds, saveNeedsLocally } from '@/lib/db';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';

interface NeedContextValue {
  needs: Need[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createNeed: (data: Partial<Need>) => Promise<Need>;
  updateNeed: (id: string, data: Partial<Need>) => Promise<void>;
  getNeedsByCategory: (category: NeedCategory) => Need[];
  getNeedsByStatus: (status: NeedStatus) => Need[];
  getNeedById: (id: string) => Need | undefined;
}

const NeedContext = createContext<NeedContextValue | null>(null);

export function NeedProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: Need[];
      if (isAuthenticated) {
        data = await api.listNeeds({ limit: 300, offset: 0 });
        await saveNeedsLocally(data);
      } else {
        data = await getLocalNeeds({});
      }
      setNeeds(data);
    } catch (e: any) {
      console.error('Failed to load needs, falling back to local:', e.message);
      try {
        const local = await getLocalNeeds({});
        setNeeds(local);
      } catch {
        setError('No se pudieron cargar las necesidades');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createNeed = useCallback(async (data: Partial<Need>): Promise<Need> => {
    const created = await api.createNeed(data);
    setNeeds((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateNeed = useCallback(async (id: string, data: Partial<Need>) => {
    await api.updateNeed(id, data);
    setNeeds((prev) => prev.map((n) => (n.id === id ? { ...n, ...data } : n)));
  }, []);

  const getNeedsByCategory = useCallback(
    (category: NeedCategory) => needs.filter((n) => n.category === category),
    [needs],
  );

  const getNeedsByStatus = useCallback(
    (status: NeedStatus) => needs.filter((n) => n.status === status),
    [needs],
  );

  const getNeedById = useCallback((id: string) => needs.find((n) => n.id === id), [needs]);

  return (
    <NeedContext.Provider
      value={{
        needs,
        isLoading,
        error,
        refresh,
        createNeed,
        updateNeed,
        getNeedsByCategory,
        getNeedsByStatus,
        getNeedById,
      }}
    >
      {children}
    </NeedContext.Provider>
  );
}

export function useNeeds(): NeedContextValue {
  const ctx = useContext(NeedContext);
  if (!ctx) throw new Error('useNeeds must be used within NeedProvider');
  return ctx;
}
