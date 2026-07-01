import { Link } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ComoFuncionaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Cómo funciona?</Text>
      <Text style={styles.body}>
        Publica una necesidad, solicita ayuda o descubre cómo colaborar.
        {'\n\n'}
        1. Crea una cuenta o reporta como invitado{'\n'}
        2. Describe la necesidad (personas, recursos, ubicación){'\n'}
        3. Un coordinador la revisa y asigna voluntarios{'\n'}
        4. Recibe actualizaciones hasta que esté resuelta
      </Text>
      <Text style={styles.section}>Protección de datos</Text>
      <Text style={styles.body}>
        Tus datos personales están protegidos. Solo los roles autorizados ven tu información.
      </Text>
      <Text style={styles.section}>Canales disponibles</Text>
      <Text style={styles.body}>App móvil • WhatsApp • Telegram • Web</Text>
      <Link href="/info/roles" asChild>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>Siguiente: Roles</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e', padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 20 },
  section: { fontSize: 18, fontWeight: '600', color: '#6fcaef', marginTop: 20, marginBottom: 8 },
  body: { fontSize: 15, color: '#c8ccd4', lineHeight: 22 },
  btn: {
    backgroundColor: '#6fcaef',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  btnText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
});
