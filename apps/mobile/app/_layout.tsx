import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { NeedProvider } from '@/providers/NeedProvider';
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

  const screens = !isAuthenticated ? (
    <>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="info" />
      <Stack.Screen name="register" />
    </>
  ) : (
    (() => {
      const roleGroup =
        role === 'citizen'
          ? '(citizen)'
          : role === 'volunteer'
            ? '(volunteer)'
            : role === 'coordinator'
              ? '(coordinator)'
              : role === 'organization'
                ? '(organization)'
                : role === 'admin'
                  ? '(admin)'
                  : null;
      return roleGroup ? <Stack.Screen name={roleGroup} /> : <Stack.Screen name="index" />;
    })()
  );

  return <Stack screenOptions={{ headerShown: false }}>{screens}</Stack>;
}

export default function Layout() {
  return (
    <AuthProvider>
      <NeedProvider>
        <RootNavigator />
      </NeedProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#15181e' },
});
