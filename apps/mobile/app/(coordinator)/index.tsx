import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { NeedDashboardStats } from '@pdv/shared';

export default function CoordinatorDashboardScreen() {
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

  const topPriority = stats?.by_priority?.slice(0, 3) ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{stats?.total ?? 0}</Text>
          <Text style={styles.cardLabel}>Necesidades totales</Text>
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
          <Text style={styles.cardLabel}>Requieren revisión</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Por estado</Text>
      <View style={styles.chips}>
        {stats?.by_status?.map((s) => (
          <View key={s.status} style={styles.chip}>
            <Text style={styles.chipCount}>{s.count}</Text>
            <Text style={styles.chipLabel}>
              {s.status === 'abierta'
                ? 'Abiertas'
                : s.status === 'en_proceso'
                  ? 'En proceso'
                  : s.status === 'resuelta'
                    ? 'Resueltas'
                    : 'Cerradas'}
            </Text>
          </View>
        ))}
      </View>

      {topPriority.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Prioridad crítica/alta</Text>
          {topPriority
            .filter((p) => p.priority === 'critica' || p.priority === 'alta')
            .map((p) => (
              <View key={p.priority} style={styles.priorityRow}>
                <Text style={p.priority === 'critica' ? styles.critica : styles.alta}>
                  {p.priority === 'critica' ? '🔴' : '🟠'} {p.count}{' '}
                  {p.priority === 'critica' ? 'Críticas' : 'Altas'}
                </Text>
              </View>
            ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 100 },
  center: { flex: 1, backgroundColor: '#15181e', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  card: { backgroundColor: '#1a1d26', borderRadius: 12, padding: 16, width: '47%', minWidth: 140 },
  cardValue: { fontSize: 28, fontWeight: '800', color: '#6fcaef' },
  cardLabel: { fontSize: 12, color: '#5d6675', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#c8ccd4', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: {
    backgroundColor: '#1a1d26',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipCount: { fontSize: 18, fontWeight: '700', color: '#6fcaef' },
  chipLabel: { fontSize: 12, color: '#c8ccd4' },
  priorityRow: { marginBottom: 6 },
  critica: { color: '#ef3b56', fontSize: 15, fontWeight: '600' },
  alta: { color: '#ea6a0a', fontSize: 15, fontWeight: '600' },
});
