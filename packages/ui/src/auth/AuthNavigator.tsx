import React, { useEffect } from 'react';
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
  const { isAuthenticated, user } = useAuth();
  const [currentScreen, setCurrentScreen] = React.useState<AuthScreen>('login');

  // Redirect to main app when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      onAuthenticated(user);
    }
  }, [isAuthenticated, user, onAuthenticated]);

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
      return (
        <ForgotPasswordScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
        />
      );

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
