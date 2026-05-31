/**
 * @module invite/AcceptInviteScreen
 * Invite acceptance screen for the MealMe platform.
 *
 * Handles the full invite acceptance flow:
 *   - Fetches invite details by token
 *   - Shows org name, inviter info, and role
 *   - Prompts unauthenticated users to log in
 *   - Handles expired / already-accepted invites
 *   - Accepts the invite and navigates to the org on success
 */

import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  Heading,
  Spinner,
  Badge,
  BadgeText,
  Card,
} from '@gluestack-ui/themed';
import { acceptInviteByToken, fetchInviteByToken } from '@mealme/api';
import type { InviteRow, OrgRole, InviteLookupResult } from '@mealme/api';
import { useAuth } from '../auth/AuthContext';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AcceptInviteScreenProps {
  /** The invite token extracted from the URL. */
  inviteToken: string;
  /** Called after the invite is successfully accepted. */
  onSuccess?: (orgId: string) => void;
  /** Called when the user needs to log in before accepting. */
  onLoginRequired?: () => void;
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type InviteStatus =
  | 'loading' // fetching invite details
  | 'not_found' // invite token doesn't match any row
  | 'expired' // invite has passed its expires_at
  | 'already_accepted' // invite.accepted_at is set
  | 'ready' // invite is valid and awaiting user action
  | 'accepting' // acceptInviteByToken in flight
  | 'success' // invite accepted
  | 'error'; // unexpected error

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const ROLE_BADGE_COLORS: Record<OrgRole, { bg: string; text: string }> = {
  owner: { bg: '$warning100', text: '$warning700' },
  admin: { bg: '$info100', text: '$info700' },
  member: { bg: '$backgroundLight200', text: '$textLight700' },
  viewer: { bg: '$backgroundLight100', text: '$textLight500' },
};

/** Fetch invite details by token via the SECURITY DEFINER RPC (bypasses RLS). */
async function fetchInviteDetails(token: string): Promise<{
  invite: InviteRow | null;
  orgName: string | null;
  inviterName: string | null;
  error: string | null;
  acceptedAt: string | null;
  expiresAt: string | null;
}> {
  const result: InviteLookupResult = await fetchInviteByToken(token);

  if (!result.success || !result.invite) {
    return {
      invite: null,
      orgName: null,
      inviterName: null,
      error: result.error ?? 'Invite not found',
      acceptedAt: result.acceptedAt,
      expiresAt: result.expiresAt,
    };
  }

  return {
    invite: result.invite,
    orgName: result.orgName,
    inviterName: result.inviterName,
    error: null,
    acceptedAt: result.acceptedAt,
    expiresAt: result.expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AcceptInviteScreen({
  inviteToken,
  onSuccess,
  onLoginRequired,
}: AcceptInviteScreenProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [acceptedOrgId, setAcceptedOrgId] = useState<string | null>(null);
  const [acceptedRole, setAcceptedRole] = useState<OrgRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ----- Fetch invite details on mount -----
  const loadInvite = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    const result = await fetchInviteDetails(inviteToken);

    if (result.error || !result.invite) {
      // Check if the invite was already accepted or expired for better UX
      if (result.acceptedAt) {
        setStatus('already_accepted');
        return;
      }
      if (result.expiresAt && new Date(result.expiresAt) < new Date()) {
        setStatus('expired');
        return;
      }
      setStatus('not_found');
      setErrorMessage(result.error ?? 'Invite not found');
      return;
    }

    setInvite(result.invite);
    setOrgName(result.orgName);
    setInviterName(result.inviterName);

    // Check if already accepted
    if (result.invite.accepted_at) {
      setStatus('already_accepted');
      return;
    }

    // Check if expired
    if (new Date(result.invite.expires_at) < new Date()) {
      setStatus('expired');
      return;
    }

    setStatus('ready');
  }, [inviteToken]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  // ----- Accept the invite -----
  const handleAccept = useCallback(async () => {
    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }

    setStatus('accepting');

    const result = await acceptInviteByToken(inviteToken);

    if (result.error || !result.success) {
      setStatus('error');
      setErrorMessage(result.error ?? 'Failed to accept invite');
      return;
    }

    setAcceptedOrgId(result.orgId);
    setAcceptedRole(result.role);
    setStatus('success');
  }, [isAuthenticated, inviteToken, onLoginRequired]);

  // ----- Render -----

  // Loading state
  if (status === 'loading' || authLoading) {
    return (
      <View style={styles.centerContainer}>
        <VStack space="md" alignItems="center">
          <Spinner size="large" color="$primary500" />
          <Text size="md" color="$textLight500">
            Loading invite…
          </Text>
        </VStack>
      </View>
    );
  }

  // Not found
  if (status === 'not_found') {
    return (
      <View style={styles.centerContainer}>
        <Card size="lg" variant="outline" style={styles.card}>
          <VStack space="md" alignItems="center" p="$4">
            <Heading size="md" color="$textLight900" textAlign="center">
              Invite Not Found
            </Heading>
            <Text size="sm" color="$textLight500" textAlign="center">
              This invite link is invalid or may have been removed. Please ask the organization
              admin to send a new invite.
            </Text>
            <Button variant="outline" size="md" onPress={loadInvite}>
              <ButtonText>Try Again</ButtonText>
            </Button>
          </VStack>
        </Card>
      </View>
    );
  }

  // Expired
  if (status === 'expired') {
    return (
      <View style={styles.centerContainer}>
        <Card size="lg" variant="outline" style={styles.card}>
          <VStack space="md" alignItems="center" p="$4">
            <Heading size="md" color="$textLight900" textAlign="center">
              This Invite Has Expired
            </Heading>
            <Text size="sm" color="$textLight500" textAlign="center">
              The invite to join {orgName ?? 'this organization'} has expired. Please ask the
              organization admin to send a new invite.
            </Text>
            <Button
              variant="outline"
              size="md"
              onPress={() => {
                // Best-effort: try to re-open the org list so the user can
                // request access.  The exact navigation is up to the host
                // app, but we provide a retry as a fallback.
                loadInvite();
              }}
            >
              <ButtonText>Try Again</ButtonText>
            </Button>
          </VStack>
        </Card>
      </View>
    );
  }

  // Already accepted
  if (status === 'already_accepted' && invite) {
    return (
      <View style={styles.centerContainer}>
        <Card size="lg" variant="outline" style={styles.card}>
          <VStack space="md" alignItems="center" p="$4">
            <Heading size="md" color="$textLight900" textAlign="center">
              Invite Already Accepted
            </Heading>
            <Text size="sm" color="$textLight500" textAlign="center">
              This invite to join {orgName ?? 'this organization'} has already been accepted.
            </Text>
            {isAuthenticated && invite.org_id && (
              <Button
                variant="solid"
                size="md"
                action="primary"
                onPress={() => onSuccess?.(invite.org_id)}
              >
                <ButtonText>Go to Organization</ButtonText>
              </Button>
            )}
          </VStack>
        </Card>
      </View>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <View style={styles.centerContainer}>
        <Card size="lg" variant="outline" style={styles.card}>
          <VStack space="md" alignItems="center" p="$4">
            <Heading size="md" color="$error600" textAlign="center">
              Something Went Wrong
            </Heading>
            <Text size="sm" color="$textLight500" textAlign="center">
              {errorMessage ?? 'An unexpected error occurred while accepting the invite.'}
            </Text>
            <Button variant="outline" size="md" onPress={handleAccept}>
              <ButtonText>Retry</ButtonText>
            </Button>
          </VStack>
        </Card>
      </View>
    );
  }

  // Success
  if (status === 'success') {
    const roleLabel = acceptedRole ? ROLE_LABELS[acceptedRole] : 'Member';
    return (
      <View style={styles.centerContainer}>
        <Card size="lg" variant="outline" style={styles.card}>
          <VStack space="md" alignItems="center" p="$4">
            <Heading size="lg" color="$success600" textAlign="center">
              You&apos;re In! 🎉
            </Heading>
            <Text size="md" color="$textLight700" textAlign="center">
              You&apos;ve joined {orgName ?? 'the organization'} as a {roleLabel}!
            </Text>
            {acceptedOrgId && (
              <Button
                variant="solid"
                size="md"
                action="primary"
                onPress={() => onSuccess?.(acceptedOrgId)}
              >
                <ButtonText>Go to Organization</ButtonText>
              </Button>
            )}
          </VStack>
        </Card>
      </View>
    );
  }

  // Accepting (in-flight)
  if (status === 'accepting') {
    return (
      <View style={styles.centerContainer}>
        <Card size="lg" variant="outline" style={styles.card}>
          <VStack space="md" alignItems="center" p="$4">
            <Spinner size="large" color="$primary500" />
            <Text size="md" color="$textLight500">
              Accepting invite…
            </Text>
          </VStack>
        </Card>
      </View>
    );
  }

  // Ready — show invite details and accept button
  // status === 'ready'
  if (!invite) return null;

  const roleBadgeColor = ROLE_BADGE_COLORS[invite.role] ?? ROLE_BADGE_COLORS.member;

  return (
    <View style={styles.centerContainer}>
      <Card size="lg" variant="outline" style={styles.card}>
        <VStack space="lg" p="$4">
          {/* Header */}
          <VStack space="xs" alignItems="center">
            <Heading size="lg" color="$textLight900" textAlign="center">
              You&apos;re Invited!
            </Heading>
            <Text size="sm" color="$textLight500" textAlign="center">
              {inviterName ?? 'Someone'} has invited you to join
            </Text>
          </VStack>

          {/* Org name */}
          <Box
            bg="$backgroundLight50"
            borderRadius="$lg"
            p="$4"
            borderWidth={1}
            borderColor="$borderLight200"
          >
            <VStack space="sm" alignItems="center">
              <Heading size="md" color="$primary700" textAlign="center">
                {orgName ?? 'Organization'}
              </Heading>
              <HStack space="sm" alignItems="center">
                <Text size="sm" color="$textLight600">
                  Role:
                </Text>
                <Badge
                  size="sm"
                  variant="solid"
                  bg={roleBadgeColor.bg}
                  borderRadius="$md"
                  px="$2"
                  py="$1"
                >
                  <BadgeText size="xs" color={roleBadgeColor.text}>
                    {ROLE_LABELS[invite.role] ?? invite.role}
                  </BadgeText>
                </Badge>
              </HStack>
            </VStack>
          </Box>

          {/* Auth prompt or accept button */}
          {!isAuthenticated ? (
            <VStack space="md" alignItems="center">
              <Text size="sm" color="$textLight500" textAlign="center">
                You need to be logged in to accept this invite.
              </Text>
              <Button
                variant="solid"
                size="md"
                action="primary"
                onPress={() => onLoginRequired?.()}
                style={styles.fullWidthButton}
              >
                <ButtonText>Log In to Accept</ButtonText>
              </Button>
            </VStack>
          ) : (
            <Button
              variant="solid"
              size="md"
              action="primary"
              onPress={handleAccept}
              style={styles.fullWidthButton}
            >
              <ButtonText>Accept Invite</ButtonText>
            </Button>
          )}
        </VStack>
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    maxWidth: 440,
    width: '100%',
  },
  centerContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  fullWidthButton: {
    width: '100%',
  },
});
