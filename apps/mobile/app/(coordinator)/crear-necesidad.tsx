import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useNeeds } from '@/providers/NeedProvider';
import type { NeedCategory } from '@pdv/shared';
import { CATEGORY_LABELS } from '@pdv/shared';

const CATEGORIES: NeedCategory[] = ['profesionales', 'no_profesionales', 'logistica', 'otros'];

export default function CrearNecesidadScreen() {
  const { refresh } = useNeeds();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<NeedCategory | null>(null);
  const [scope, setScope] = useState<'micro' | 'macro'>('micro');
  const [peopleRequired, setPeopleRequired] = useState('');
  const [locationText, setLocationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title || !description || !category) {
      Alert.alert('Error', 'Completa título, descripción y categoría');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.createNeed({
        title,
        description,
        category,
        scope,
        peopleRequired: peopleRequired ? parseInt(peopleRequired, 10) : null,
        locationText: locationText || null,
      });
      await refresh();
      Alert.alert('Creada', 'La necesidad fue publicada.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo crear');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Crear necesidad</Text>

      <View style={styles.scopeRow}>
        {(['micro', 'macro'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.scopeBtn, scope === s && styles.scopeBtnActive]}
            onPress={() => setScope(s)}
          >
            <Text style={[styles.scopeText, scope === s && styles.scopeTextActive]}>
              {s === 'micro' ? 'Micro' : 'Macro'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Título"
        placeholderTextColor="#5d6675"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.inputMultiline}
        placeholder="Descripción"
        placeholderTextColor="#5d6675"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />
      <TextInput
        style={styles.input}
        placeholder="Ubicación"
        placeholderTextColor="#5d6675"
        value={locationText}
        onChangeText={setLocationText}
      />
      <TextInput
        style={styles.input}
        placeholder="Personas requeridas"
        placeholderTextColor="#5d6675"
        value={peopleRequired}
        onChangeText={setPeopleRequired}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Categoría</Text>
      <View style={styles.catRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.catBtn, category === c && styles.catBtnActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.catText, category === c && styles.catTextActive]}>
              {CATEGORY_LABELS[c]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
        <Text style={styles.submitText}>
          {isSubmitting ? 'Publicando...' : 'Publicar necesidad'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 20 },
  scopeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  scopeBtn: {
    backgroundColor: '#1a1d26',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2d36',
  },
  scopeBtnActive: { borderColor: '#6fcaef', backgroundColor: '#1a2a36' },
  scopeText: { color: '#5d6675', fontSize: 14, fontWeight: '600' },
  scopeTextActive: { color: '#6fcaef' },
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  label: { color: '#c8ccd4', fontSize: 14, marginBottom: 8 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  catBtn: {
    backgroundColor: '#1a1d26',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2d36',
  },
  catBtnActive: { borderColor: '#6fcaef', backgroundColor: '#1a2a36' },
  catText: { color: '#5d6675', fontSize: 13 },
  catTextActive: { color: '#6fcaef' },
  submitBtn: {
    backgroundColor: '#6fcaef',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
});
