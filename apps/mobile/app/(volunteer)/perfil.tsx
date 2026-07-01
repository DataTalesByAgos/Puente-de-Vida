import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import type { NeedCategory } from '@pdv/shared';
import { CATEGORY_LABELS } from '@pdv/shared';

const ALL_CATEGORIES: NeedCategory[] = ['profesionales', 'no_profesionales', 'logistica', 'otros'];

export default function VolunteerProfileScreen() {
  const { username, logout } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<NeedCategory[]>([]);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const profile = await api.getProfile();
        setSelectedCategories(profile.categories_of_interest || []);
      } catch {
        // no profile yet
      }
    })();
  }, []);

  function toggleCategory(cat: NeedCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
    setIsSaved(false);
  }

  async function saveProfile() {
    try {
      await api.updateProfile({
        categoriesOfInterest: selectedCategories,
        skills: [],
        availability: 'programada',
      });
      setIsSaved(true);
      Alert.alert('Perfil actualizado', 'Tus categorías de interés se han guardado.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar el perfil');
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi perfil</Text>
      {username && <Text style={styles.username}>@{username}</Text>}

      <Text style={styles.sectionTitle}>Categorías de interés</Text>
      <Text style={styles.hint}>
        Selecciona las categorías en las que quieres colaborar. La aplicación te mostrará
        necesidades compatibles.
      </Text>

      <View style={styles.categoriesGrid}>
        {ALL_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryBtn,
              selectedCategories.includes(cat) && styles.categoryBtnActive,
            ]}
            onPress={() => toggleCategory(cat)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategories.includes(cat) && styles.categoryTextActive,
              ]}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isSaved && (
        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
          <Text style={styles.saveBtnText}>Guardar preferencias</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15181e' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  username: { fontSize: 14, color: '#5d6675', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#c8ccd4', marginBottom: 8 },
  hint: { fontSize: 13, color: '#5d6675', marginBottom: 16, lineHeight: 18 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  categoryBtn: {
    backgroundColor: '#1a1d26',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2d36',
  },
  categoryBtnActive: { borderColor: '#6fcaef', backgroundColor: '#1a2a36' },
  categoryText: { color: '#5d6675', fontSize: 14, fontWeight: '500' },
  categoryTextActive: { color: '#6fcaef' },
  saveBtn: {
    backgroundColor: '#6fcaef',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtnText: { color: '#15181e', fontSize: 16, fontWeight: '700' },
  logoutBtn: {
    borderColor: '#ef3b56',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: { color: '#ef3b56', fontSize: 15, fontWeight: '600' },
});
