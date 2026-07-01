import { useState } from 'react';
import { router } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function RegisterPaso2() {
  const [state, setState] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Paso 2 de 4</Text>
      <Text style={styles.title}>Información adicional</Text>

      <TextInput
        style={styles.input}
        placeholder="Estado"
        placeholderTextColor="#5d6675"
        value={state}
        onChangeText={setState}
      />
      <TextInput
        style={styles.input}
        placeholder="Municipio"
        placeholderTextColor="#5d6675"
        value={municipality}
        onChangeText={setMunicipality}
      />
      <TextInput
        style={styles.input}
        placeholder="Dirección"
        placeholderTextColor="#5d6675"
        value={address}
        onChangeText={setAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Ocupación"
        placeholderTextColor="#5d6675"
        value={occupation}
        onChangeText={setOccupation}
      />

      <TouchableOpacity style={styles.btn} onPress={() => router.push('/register/paso-3')}>
        <Text style={styles.btnText}>Siguiente</Text>
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
  input: {
    backgroundColor: '#1a1d26',
    color: '#ffffff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  btn: {
    backgroundColor: '#6fcaef',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  btnText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
});
