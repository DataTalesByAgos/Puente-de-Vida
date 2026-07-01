import { Tabs } from 'expo-router';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#15181e', borderTopColor: '#2a2d36' },
        tabBarActiveTintColor: '#6fcaef',
        tabBarInactiveTintColor: '#5d6675',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarLabel: 'Dashboard' }} />
      <Tabs.Screen name="usuarios" options={{ title: 'Usuarios', tabBarLabel: 'Usuarios' }} />
      <Tabs.Screen name="fuentes" options={{ title: 'Fuentes', tabBarLabel: 'Fuentes' }} />
      <Tabs.Screen
        name="integraciones"
        options={{ title: 'Integraciones', tabBarLabel: 'Integraciones' }}
      />
      <Tabs.Screen name="logs" options={{ title: 'Logs', tabBarLabel: 'Logs' }} />
    </Tabs>
  );
}
