import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function CitizenLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#15181e', borderTopColor: '#2a2d36' },
        tabBarActiveTintColor: '#6fcaef',
        tabBarInactiveTintColor: '#5d6675',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarLabel: 'Inicio' }} />
      <Tabs.Screen name="publicar" options={{ title: 'Publicar', tabBarLabel: 'Publicar' }} />
      <Tabs.Screen name="info-util" options={{ title: 'Info útil', tabBarLabel: 'Info útil' }} />
      <Tabs.Screen name="config" options={{ title: 'Config', tabBarLabel: 'Config' }} />
    </Tabs>
  );
}
