import { Stack } from 'expo-router';

export default function InfoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="como-funciona" />
      <Stack.Screen name="roles" />
      <Stack.Screen name="antes-de-empezar" />
    </Stack>
  );
}
