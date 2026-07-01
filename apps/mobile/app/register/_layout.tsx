import { Stack } from 'expo-router';

export default function RegisterLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="paso-1" />
      <Stack.Screen name="paso-2" />
      <Stack.Screen name="paso-3" />
      <Stack.Screen name="paso-4" />
    </Stack>
  );
}
