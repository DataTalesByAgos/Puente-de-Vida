import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

function RootNavigator() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6fcaef" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="info" />
        <Stack.Screen name="register" />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {role === 'citizen' && <Stack.Screen name="(citizen)" />}
      {role === 'volunteer' && <Stack.Screen name="(volunteer)" />}
      {role === 'coordinator' && <Stack.Screen name="(coordinator)" />}
      {role === 'organization' && <Stack.Screen name="(organization)" />}
      {role === 'admin' && <Stack.Screen name="(admin)" />}
    </Stack>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#15181e' },
});
