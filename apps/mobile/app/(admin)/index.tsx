import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AdminDashboardScreen() {
  const [health, setHealth] = useState<{ status: string; aiEngine: string; time: string } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const h = await api.health();
        setHealth(h);
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
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard técnico</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Estado del servidor</Text>
        <Text style={[styles.value, { color: health?.status === 'ok' ? '#25d366' : '#ef3b56' }]}>
          {health?.status === 'ok' ? 'Operativo' : 'Caído'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Motor IA</Text>
        <Text style={styles.value}>{health?.aiEngine ?? 'N/A'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Último heartbeat</Text>
        <Text style={styles.value}>
          {health?.time ? new Date(health.time).toLocaleString() : 'N/A'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e', padding: 24, paddingTop: 60 },
  center: { flex: 1, backgroundColor: '#15181e', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 24 },
  card: { backgroundColor: '#1a1d26', borderRadius: 12, padding: 16, marginBottom: 10 },
  label: { fontSize: 13, color: '#5d6675', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});
