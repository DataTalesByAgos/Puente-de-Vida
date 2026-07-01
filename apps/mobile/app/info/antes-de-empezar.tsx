import { Link } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function AntesDeEmpezarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Antes de empezar</Text>

      <Text style={styles.section}>Privacidad</Text>
      <Text style={styles.body}>
        Tus datos personales están protegidos por niveles: cada rol ve solo la información necesaria
        para su función.
      </Text>

      <Text style={styles.section}>Puntaje de confianza</Text>
      <Text style={styles.body}>
        Verificar tu identidad aumenta tu nivel de confianza y te da acceso a más funciones dentro
        de la plataforma.
      </Text>

      <Text style={styles.section}>Verificación de identidad</Text>
      <Text style={styles.body}>
        Voluntarios, coordinadores y organizaciones deben verificar su identidad para operar.
        Ciudadanos pueden hacerlo opcionalmente.
      </Text>

      <Link href="/register" asChild>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>Crear cuenta</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e', padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 24 },
  section: { fontSize: 18, fontWeight: '600', color: '#6fcaef', marginTop: 20, marginBottom: 8 },
  body: { fontSize: 14, color: '#c8ccd4', lineHeight: 20 },
  btn: {
    backgroundColor: '#6fcaef',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  btnText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
});
