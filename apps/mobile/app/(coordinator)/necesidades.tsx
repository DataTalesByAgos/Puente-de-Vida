import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNeeds } from '@/providers/NeedProvider';
import { NeedCard } from '@/components/NeedCard';
import { Link } from 'expo-router';
import type { Need } from '@pdv/shared';

export default function CoordinatorNeedsScreen() {
  const { needs, isLoading, refresh } = useNeeds();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Necesidades</Text>
        <Link href="/(coordinator)/crear-necesidad" asChild>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Nueva</Text>
          </TouchableOpacity>
        </Link>
      </View>
      <FlatList
        data={needs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Need }) => <NeedCard need={item} />}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={refresh}
        ListEmptyComponent={<Text style={styles.empty}>No hay necesidades registradas.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e', paddingTop: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  addBtn: {
    backgroundColor: '#6fcaef',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addBtnText: { color: '#15181e', fontSize: 14, fontWeight: '700' },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  empty: { color: '#5d6675', textAlign: 'center', marginTop: 60, fontSize: 15 },
});
