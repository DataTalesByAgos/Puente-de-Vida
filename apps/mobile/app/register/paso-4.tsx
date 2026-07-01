import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function RegisterPaso4() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(citizen)');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.checkmark}>✓</Text>
      <Text style={styles.title}>Cuenta creada</Text>
      <Text style={styles.body}>Estamos preparando tu experiencia...</Text>
      <ActivityIndicator size="large" color="#6fcaef" style={{ marginTop: 24 }} />
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
  checkmark: { fontSize: 48, color: '#25d366', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  body: { fontSize: 15, color: '#5d6675' },
});
