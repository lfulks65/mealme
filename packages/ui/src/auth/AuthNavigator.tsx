import React, { useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { useAuth, User } from './AuthContext';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

export type AuthScreen = 'login' | 'signup' | 'forgotPassword';

export interface AuthNavigatorProps {
  /** Called when the user successfully authenticates */
  onAuthenticated: (user: User) => void;

  /** Render the main app content when authenticated */
  children?: React.ReactNode;
}

export function AuthNavigator({ onAuthenticated, children }: AuthNavigatorProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = React.useState<AuthScreen>('login');

  // Redirect to main app when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      onAuthenticated(user);
    }
  }, [isAuthenticated, user, onAuthenticated]);

  // Show a loading/splash screen while the session is being resolved
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text size="md" color="$textLight500" mt="$4">
          Loading...
        </Text>
      </View>
    );
  }

  // If authenticated, render children (main app)
  if (isAuthenticated && children) {
    return <>{children}</>;
  }

  // Show auth screens when not authenticated
  switch (currentScreen) {
    case 'signup':
      return (
        <SignupScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
          onSignupSuccess={() => {
            // Navigation handled by the isAuthenticated effect
          }}
        />
      );

    case 'forgotPassword':
      return <ForgotPasswordScreen onNavigateToLogin={() => setCurrentScreen('login')} />;

    case 'login':
    default:
      return (
        <LoginScreen
          onNavigateToSignup={() => setCurrentScreen('signup')}
          onNavigateToForgotPassword={() => setCurrentScreen('forgotPassword')}
          onLoginSuccess={() => {
            // Navigation handled by the isAuthenticated effect
          }}
        />
      );
  }
}

/**
 * Hook to protect routes — redirects to login when unauthenticated.
 * Use this in your main app screens to enforce auth.
 */
export function useRequireAuth(redirectToLogin: () => void): {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      redirectToLogin();
    }
  }, [isLoading, isAuthenticated, redirectToLogin]);

  return { user, isAuthenticated, isLoading };
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
  },
});
