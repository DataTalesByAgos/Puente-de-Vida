import { Tabs } from 'expo-router';

export default function VolunteerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#15181e', borderTopColor: '#2a2d36' },
        tabBarActiveTintColor: '#6fcaef',
        tabBarInactiveTintColor: '#5d6675',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Asignaciones', tabBarLabel: 'Asignaciones' }} />
      <Tabs.Screen name="descubrir" options={{ title: 'Descubrir', tabBarLabel: 'Descubrir' }} />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa', tabBarLabel: 'Mapa' }} />
      <Tabs.Screen name="recursos" options={{ title: 'Recursos', tabBarLabel: 'Recursos' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarLabel: 'Perfil' }} />
    </Tabs>
  );
}
