import { Tabs } from 'expo-router';

export default function OrganizationLayout() {
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
      <Tabs.Screen name="personal" options={{ title: 'Personal', tabBarLabel: 'Personal' }} />
      <Tabs.Screen name="recursos" options={{ title: 'Recursos', tabBarLabel: 'Recursos' }} />
      <Tabs.Screen name="campanas" options={{ title: 'Campañas', tabBarLabel: 'Campañas' }} />
      <Tabs.Screen name="estadisticas" options={{ title: 'Stats', tabBarLabel: 'Stats' }} />
      <Tabs.Screen name="config" options={{ title: 'Config', tabBarLabel: 'Config' }} />
    </Tabs>
  );
}
