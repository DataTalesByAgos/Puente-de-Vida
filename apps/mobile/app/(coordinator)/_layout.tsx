import { Tabs, Stack } from 'expo-router';

export default function CoordinatorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="necesidades" />
      <Stack.Screen name="crear-necesidad" options={{ presentation: 'modal' }} />
      <Stack.Screen name="voluntarios" />
      <Stack.Screen name="mapa" />
      <Stack.Screen name="estadisticas" />
    </Stack>
  );
}
