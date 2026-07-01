import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function InfoUtilScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Información útil</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Organizaciones</Text>
        <Text style={styles.cardBody}>Centros de ayuda, albergues y puntos de distribución.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Teléfonos de emergencia</Text>
        <Text style={styles.cardBody}>Protección Civil, Bomberos, ambulancias.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Guías de actuación</Text>
        <Text style={styles.cardBody}>Recomendaciones para diferentes tipos de emergencia.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Convenios</Text>
        <Text style={styles.cardBody}>Alianzas con organizaciones de apoyo comunitario.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e' },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 16, marginTop: 60 },
  card: { backgroundColor: '#1a1d26', borderRadius: 12, padding: 16, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#6fcaef', marginBottom: 4 },
  cardBody: { fontSize: 14, color: '#c8ccd4' },
});
