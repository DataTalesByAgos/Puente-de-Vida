import { Tabs } from 'expo-router';

export default function CoordinatorLayout() {
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
      <Tabs.Screen
        name="necesidades"
        options={{ title: 'Necesidades', tabBarLabel: 'Necesidades' }}
      />
      <Tabs.Screen
        name="voluntarios"
        options={{ title: 'Voluntarios', tabBarLabel: 'Voluntarios' }}
      />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa', tabBarLabel: 'Mapa' }} />
      <Tabs.Screen name="estadisticas" options={{ title: 'Stats', tabBarLabel: 'Stats' }} />
    </Tabs>
  );
}
