import { Link } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function WelcomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Puente de Vida</Text>
      <Text style={styles.subtitle}>Reporta necesidades y encuentra ayuda cerca de ti.</Text>

      <View style={styles.actions}>
        <Link href="/register" asChild>
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Crear cuenta</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/login" asChild>
          <TouchableOpacity style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/info/como-funciona" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>¿Cómo funciona?</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.channels}>
        <Text style={styles.channelTitle}>También puedes reportar por:</Text>
        <TouchableOpacity style={styles.channelBtn}>
          <Text style={styles.channelBtnText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.channelBtn}>
          <Text style={styles.channelBtnText}>Telegram</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e' },
  content: { padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: '100%' },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#5d6675',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  actions: { width: '100%', gap: 12, marginBottom: 40 },
  primaryBtn: {
    backgroundColor: '#6fcaef',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderColor: '#6fcaef',
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#6fcaef', fontSize: 16, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: '#5d6675', fontSize: 14 },
  channels: { width: '100%', gap: 8 },
  channelTitle: { color: '#5d6675', fontSize: 13, textAlign: 'center', marginBottom: 4 },
  channelBtn: {
    backgroundColor: '#1a1d26',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  channelBtnText: { color: '#ffffff', fontSize: 14 },
});
