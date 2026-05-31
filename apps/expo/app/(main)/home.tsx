import { View, StyleSheet } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { Button, ButtonText } from '@gluestack-ui/themed';
import { VStack } from '@gluestack-ui/themed';
import { HStack } from '@gluestack-ui/themed';
import { useAuth } from '@mealme/ui';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <VStack alignItems="center" style={styles.content}>
        <Text style={styles.title}>Welcome to MealMe</Text>
        {user && <Text style={styles.subtitle}>Hello, {user.name}!</Text>}

        <HStack style={styles.buttonRow}>
          <Button variant="solid" action="primary" onPress={() => router.push('/families/index')}>
            <ButtonText>Families</ButtonText>
          </Button>

          <Button variant="outline" action="secondary" onPress={signOut} isDisabled={isLoading}>
            <ButtonText>Sign Out</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    gap: 16,
    paddingHorizontal: 24,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 16,
  },
  title: {
    color: '#1a1a2e',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
