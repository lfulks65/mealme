import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { Button, ButtonText } from '@gluestack-ui/themed';
import { VStack } from '@gluestack-ui/themed';
import { HStack } from '@gluestack-ui/themed';
import { useAuth, PendingInvitesCard } from '@mealme/ui';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <VStack alignItems="center" style={styles.content}>
        <Text style={styles.title}>Welcome to MealMe</Text>
        {user && <Text style={styles.subtitle}>Hello, {user.name}!</Text>}

        {/* Pending Invites */}
        <View style={styles.invitesContainer}>
          <PendingInvitesCard
            onAcceptSuccess={(orgId: string) => {
              router.push(`/(main)/orgs/${orgId}`);
            }}
          />
        </View>

        <HStack style={styles.buttonRow}>
          <Button variant="solid" action="primary" onPress={() => router.push('/families/index')}>
            <ButtonText>Families</ButtonText>
          </Button>

          <Button variant="solid" action="primary" onPress={() => router.push('/orgs/index')}>
            <ButtonText>Organizations</ButtonText>
          </Button>

          <Button variant="outline" action="secondary" onPress={signOut} isDisabled={isLoading}>
            <ButtonText>Sign Out</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  content: {
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  invitesContainer: {
    maxWidth: 400,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollView: {
    backgroundColor: '#FFFFFF',
    flex: 1,
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
