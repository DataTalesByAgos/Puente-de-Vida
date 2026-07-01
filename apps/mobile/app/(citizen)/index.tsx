import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useNeeds } from '@/providers/NeedProvider';
import { NeedCard } from '@/components/NeedCard';
import type { Need } from '@pdv/shared';

export default function CitizenHomeScreen() {
  const { needs, isLoading, error } = useNeeds();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6fcaef" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Necesidades cercanas</Text>
      <FlatList
        data={needs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Need }) => <NeedCard need={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay necesidades públicas en tu zona.</Text>
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
  errorText: { color: '#ef3b56', textAlign: 'center', fontSize: 15 },
});
