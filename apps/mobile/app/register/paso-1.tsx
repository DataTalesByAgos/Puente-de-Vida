import { useState } from 'react';
import { router } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function RegisterPaso1() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [userType, setUserType] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Paso 1 de 4</Text>
      <Text style={styles.title}>Datos personales</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        placeholderTextColor="#5d6675"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#5d6675"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        placeholderTextColor="#5d6675"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Fecha de nacimiento (DD/MM/AAAA)"
        placeholderTextColor="#5d6675"
        value={birthDate}
        onChangeText={setBirthDate}
      />

      <Text style={styles.label}>Tipo de usuario</Text>
      <View style={styles.typeRow}>
        {(['citizen', 'volunteer', 'coordinator', 'organization'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, userType === t && styles.typeBtnActive]}
            onPress={() => setUserType(t)}
          >
            <Text style={[styles.typeText, userType === t && styles.typeTextActive]}>
              {t === 'citizen'
                ? 'Ciudadano'
                : t === 'volunteer'
                  ? 'Voluntario'
                  : t === 'coordinator'
                    ? 'Coordinador'
                    : 'Organización'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => router.push('/register/paso-2')}>
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
  label: { color: '#c8ccd4', fontSize: 14, marginBottom: 8, marginTop: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  typeBtn: {
    backgroundColor: '#1a1d26',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2d36',
  },
  typeBtnActive: { borderColor: '#6fcaef', backgroundColor: '#1a2a36' },
  typeText: { color: '#5d6675', fontSize: 13 },
  typeTextActive: { color: '#6fcaef' },
  btn: { backgroundColor: '#6fcaef', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
});
