import { useState, useEffect } from 'react';
import type { Need, NeedCategory } from '@pdv/shared';
import { getLocalNeeds } from '@/lib/db';
import { api } from '@/lib/api';

interface VolunteerProfile {
  categories_of_interest: NeedCategory[];
  max_distance_km: number | null;
}

export function useVolunteerMatch(profile: VolunteerProfile | null) {
  const [matches, setMatches] = useState<Need[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      try {
        const data = await api.listNeeds({
          status: 'abierta',
          limit: 100,
        });
        const filtered = data.filter((n) => profile.categories_of_interest.includes(n.category));
        setMatches(filtered);
      } catch {
        const local = await getLocalNeeds({ status: 'abierta' });
        const filtered = local.filter((n: Need) =>
          profile.categories_of_interest.includes(n.category),
        );
        setMatches(filtered);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [profile]);

  return { matches, isLoading };
}
