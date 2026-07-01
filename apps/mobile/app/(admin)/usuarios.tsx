import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  username: string;
  role: string;
  verified: boolean;
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.listUsers();
        setUsers(data);
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
      <Text style={styles.title}>Usuarios</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <View>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.role}>
                {item.role}
                {item.verified ? ' ✓' : ''}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
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
  userRow: { backgroundColor: '#1a1d26', borderRadius: 10, padding: 14, marginBottom: 8 },
  username: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  role: { color: '#5d6675', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
});
