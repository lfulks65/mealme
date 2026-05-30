'use client';

import { useAuth } from '@mealme/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Button, ButtonText } from '@gluestack-ui/themed';
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
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <VStack space="lg" alignItems="center" style={styles.content}>
        <Text style={styles.title}>Welcome to MealMe</Text>
        {user && (
          <Text style={styles.subtitle}>Hello, {user.name}!</Text>
        )}
        <Button
          size="md"
          variant="outline"
          action="secondary"
          onPress={signOut}
          isDisabled={isLoading}
        >
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#737373',
  },
});
