import { Redirect } from 'expo-router';

export default function Index() {
  // Default redirect to login
  return <Redirect href="/(auth)/login" />;
}
