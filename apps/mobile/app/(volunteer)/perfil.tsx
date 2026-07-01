import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';

export default function VolunteerProfileScreen() {
  const { username, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.body}>Categorías de interés: Profesionales, Logística</Text>
      <Text style={styles.body}>Disponibilidad: Programada</Text>
      <Text style={styles.body}>Zona: Caracas</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15181e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 16 },
  body: { fontSize: 15, color: '#c8ccd4', marginBottom: 8 },
  logoutBtn: {
    borderColor: '#ef3b56',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutText: { color: '#ef3b56', fontSize: 15, fontWeight: '600' },
});
