import { View, Text, StyleSheet } from 'react-native';

export default function AdminLogsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logs del sistema</Text>
      <Text style={styles.body}>Eventos técnicos, auditoría, disponibilidad.</Text>
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
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  body: { fontSize: 15, color: '#5d6675', textAlign: 'center' },
});
