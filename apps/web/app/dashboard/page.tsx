'use client';

import { useAuth } from '@mealme/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
import { VStack } from '@gluestack-ui/themed';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const router = useRouter();

  // Protected route: redirect to login if unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text size="md" color="$textLight500">Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
        <Button
          size="md"
          variant="outline"
          action="secondary"
          onPress={signOut}
          isDisabled={isLoading}
        >
          {isLoading && <ButtonSpinner mr="$2" />}
          <ButtonText>Sign Out</ButtonText>
        </Button>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
