import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { NeedDashboardStats } from '@pdv/shared';

export default function OrgDashboardScreen() {
  const [stats, setStats] = useState<NeedDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch {
        // fallback
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{stats?.total ?? 0}</Text>
          <Text style={styles.cardLabel}>Necesidades activas</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{stats?.volunteers_active ?? 0}</Text>
          <Text style={styles.cardLabel}>Voluntarios activos</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{stats?.organizations_active ?? 0}</Text>
          <Text style={styles.cardLabel}>Organizaciones</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{stats?.needs_pending_review ?? 0}</Text>
          <Text style={styles.cardLabel}>Pendientes revisión</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Por categoría</Text>
      {stats?.by_category?.map((c) => (
        <View key={c.category} style={styles.row}>
          <Text style={styles.rowLabel}>{c.category}</Text>
          <Text style={styles.rowValue}>{c.count}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 100 },
  center: { flex: 1, backgroundColor: '#15181e', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  card: { backgroundColor: '#1a1d26', borderRadius: 12, padding: 16, width: '47%' },
  cardValue: { fontSize: 28, fontWeight: '800', color: '#6fcaef' },
  cardLabel: { fontSize: 12, color: '#5d6675', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#c8ccd4', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1a1d26',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  rowLabel: { color: '#c8ccd4', fontSize: 14, textTransform: 'capitalize' },
  rowValue: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
