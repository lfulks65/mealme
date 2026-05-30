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
      <VStack space="lg" alignItems="center" style={styles.content}>
        <Text size="2xl" fontWeight="$bold" color="$textLight900">
          Welcome to MealMe
        </Text>
        {user && (
          <Text size="md" color="$textLight500">
            Hello, {user.name}!
          </Text>
        )}

        <HStack space="md" flexWrap="wrap" justifyContent="center">
          <Button
            size="md"
            variant="solid"
            action="primary"
            onPress={() => router.push('/families/index')}
          >
            <ButtonText>Families</ButtonText>
          </Button>

          <Button
            size="md"
            variant="outline"
            action="secondary"
            onPress={signOut}
            isDisabled={isLoading}
          >
            <ButtonText>Sign Out</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
  },
});
