import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TenantSwitcher } from '@mealme/ui';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2196F3',
        headerTitle: () => null,
        headerLeft: () => (
          <View style={{ marginLeft: 12 }}>
            <TenantSwitcher
              compact
              onCreateOrgPress={() => router.push('/orgs/index')}
              onCreateFamilyPress={() => router.push('/families/index')}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="families"
        options={{
          title: 'Families',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orgs"
        options={{
          title: 'Organizations',
          tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
