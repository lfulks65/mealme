import { Redirect, Stack, Link } from 'expo-router';
import { useAuth } from '@mealme/ui';
import { LoginScreen as SharedLoginScreen } from '@mealme/ui';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import React from 'react';

export default function LoginScreen() {
  const { isAuthenticated } = useAuth();

  // Redirect if authenticated
  if (isAuthenticated) {
    return <Redirect href="/(main)/home" />;
  }

  return (
    <SharedLoginScreen
      onNavigateToSignup={() => {
        // Use expo-router navigation
        const router = require('expo-router').router;
        router.push('/(auth)/signup');
      }}
      onNavigateToForgotPassword={() => {
        const router = require('expo-router').router;
        router.push('/(auth)/forgot-password');
      }}
    />
  );
}
