import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

export default function PublicarNeedScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit() {
    if (!title || !description) {
      Alert.alert('Error', 'Completa título y descripción');
      return;
    }
    Alert.alert('Necesidad publicada', 'Tu solicitud será revisada por un coordinador.');
    router.back();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Publicar necesidad</Text>
      <TextInput
        style={styles.input}
        placeholder="Título"
        placeholderTextColor="#5d6675"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.inputMultiline}
        placeholder="Describe la necesidad"
        placeholderTextColor="#5d6675"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
      />
      <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
        <Text style={styles.btnText}>Publicar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 20, marginTop: 60 },
  input: {
    backgroundColor: '#1a1d26',
    color: '#ffffff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  inputMultiline: {
    backgroundColor: '#1a1d26',
    color: '#ffffff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  btn: { backgroundColor: '#6fcaef', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
});
