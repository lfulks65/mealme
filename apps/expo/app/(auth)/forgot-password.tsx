import { ForgotPasswordScreen as SharedForgotPasswordScreen } from '@mealme/ui';

export default function ForgotPasswordScreen() {
  return (
    <SharedForgotPasswordScreen
      onNavigateToLogin={() => {
        const router = require('expo-router').router;
        router.push('/(auth)/login');
      }}
    />
  );
}
