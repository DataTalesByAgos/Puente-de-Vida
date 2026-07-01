import { View, Text, StyleSheet } from 'react-native';

export default function VolunteerMapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa</Text>
      <Text style={styles.body}>Necesidades cercanas en tu zona.</Text>
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
