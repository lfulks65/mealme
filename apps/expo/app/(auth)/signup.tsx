import { Redirect } from 'expo-router';
import { useAuth } from '@mealme/ui';
import { SignupScreen as SharedSignupScreen } from '@mealme/ui';

export default function SignupScreen() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(main)/home" />;
  }

  return (
    <SharedSignupScreen
      onNavigateToLogin={() => {
        const router = require('expo-router').router;
        router.push('/(auth)/login');
      }}
    />
  );
}
