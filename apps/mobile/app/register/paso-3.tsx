import { router } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function RegisterPaso3() {
  return (
    <View style={styles.container}>
      <Text style={styles.step}>Paso 3 de 4</Text>
      <Text style={styles.title}>Verificación de identidad</Text>

      <Text style={styles.body}>
        Verificar tu identidad aumenta tu nivel de confianza en la plataforma.
        {'\n\n'}
        Según tu rol:
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ciudadano</Text>
        <Text style={styles.cardBody}>Verificación opcional. Puedes continuar sin verificar.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Voluntario / Coordinador / Organización</Text>
        <Text style={styles.cardBody}>Verificación obligatoria para operar en la plataforma.</Text>
      </View>

      <Text style={styles.body}>
        Al verificar podrás acceder a más funciones y aumentar tu nivel de confianza.
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/register/paso-4')}>
        <Text style={styles.primaryBtnText}>Verificar ahora</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={() => router.push('/register/paso-4')}>
        <Text style={styles.skipText}>Omitir (solo ciudadano)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e', padding: 24, justifyContent: 'center' },
  step: {
    fontSize: 13,
    color: '#5d6675',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 24 },
  body: { fontSize: 15, color: '#c8ccd4', lineHeight: 22, marginBottom: 16 },
  card: { backgroundColor: '#1a1d26', borderRadius: 10, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#6fcaef', marginBottom: 4 },
  cardBody: { fontSize: 13, color: '#c8ccd4' },
  primaryBtn: {
    backgroundColor: '#6fcaef',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
  skipBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  skipText: { color: '#5d6675', fontSize: 14 },
});
