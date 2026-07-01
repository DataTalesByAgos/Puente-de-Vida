import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { NeedCard } from '@/components/NeedCard';
import { getLocalNeeds } from '@/lib/db';
import type { Need } from '@pdv/shared';

export default function VolunteerDiscoverScreen() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const local = await getLocalNeeds({ status: 'abierta' });
        setNeeds(local);
      } catch {
        // no-op
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6fcaef" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Descubrir necesidades</Text>
      <FlatList
        data={needs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Need }) => <NeedCard need={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay necesidades abiertas en tu zona.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e', paddingTop: 60 },
  center: { flex: 1, backgroundColor: '#15181e', justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  empty: { color: '#5d6675', textAlign: 'center', marginTop: 60, fontSize: 15 },
});
