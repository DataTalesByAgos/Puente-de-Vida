import { Link } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function RolesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Roles disponibles</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ciudadano</Text>
        <Text style={styles.cardBody}>
          Publica necesidades, solicita ayuda, consulta información útil. Sin verificación
          obligatoria.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Voluntario</Text>
        <Text style={styles.cardBody}>
          Recibe y ejecuta asignaciones. Reporta avances desde terreno. Requiere verificación de
          identidad.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coordinador</Text>
        <Text style={styles.cardBody}>
          Crea y agrupa necesidades, asigna voluntarios, monitorea progreso, cierra tickets.
          Requiere verificación.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Organización</Text>
        <Text style={styles.cardBody}>
          Administra personal, recursos, campañas y métricas institucionales. Requiere verificación.
        </Text>
      </View>

      <Link href="/info/antes-de-empezar" asChild>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>Siguiente: Antes de empezar</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e' },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#ffffff', marginBottom: 20 },
  card: { backgroundColor: '#1a1d26', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#6fcaef', marginBottom: 6 },
  cardBody: { fontSize: 14, color: '#c8ccd4', lineHeight: 20 },
  btn: {
    backgroundColor: '#6fcaef',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
});
