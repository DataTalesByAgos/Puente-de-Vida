import { View, Text, StyleSheet } from 'react-native';

export default function OrgResourcesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recursos</Text>
      <Text style={styles.body}>Inventario y suministros disponibles.</Text>
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
