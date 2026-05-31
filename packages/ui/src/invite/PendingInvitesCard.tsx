/**
 * @module invite/PendingInvitesCard
 * Shows pending org invites for the current user.
 *
 * Used on the dashboard/home screen to display invites awaiting action.
 */

import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList } from 'react-native';
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
import { listPendingInvitesForUser, acceptInviteByToken } from '@mealme/api';
import type { InviteRow, OrgRole, AcceptInviteResult } from '@mealme/api';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PendingInvitesCardProps {
  /** Called when an invite is accepted. Provides the orgId. */
  onAcceptSuccess?: (orgId: string) => void;
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PendingInvitesCard({ onAcceptSuccess }: PendingInvitesCardProps) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    const result = await listPendingInvitesForUser();
    if (!result.error) {
      setInvites(result.invites);

      // Fetch org names for each invite
      const names: Record<string, string> = {};
      // We'll import supabase lazily to avoid circular deps
      const { supabase } = await import('@mealme/api');
      for (const invite of result.invites) {
        if (!names[invite.org_id]) {
          const { data } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', invite.org_id)
            .single();
          names[invite.org_id] = (data as any)?.name ?? 'Organization';
        }
      }
      setOrgNames(names);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleAccept = useCallback(
    async (invite: InviteRow) => {
      setAccepting(invite.id);
      const result: AcceptInviteResult = await acceptInviteByToken(invite.invite_token);
      setAccepting(null);

      if (result.error) {
        // Silently fail — the dedicated invite screen handles errors better
        return;
      }

      // Remove from local list
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));

      if (result.orgId) {
        onAcceptSuccess?.(result.orgId);
      }
    },
    [onAcceptSuccess],
  );

  if (loading) {
    return (
      <Box p="$4">
        <HStack space="sm" alignItems="center">
          <Spinner size="small" color="$primary500" />
          <Text size="sm" color="$textLight500">
            Loading invites…
          </Text>
        </HStack>
      </Box>
    );
  }

  if (invites.length === 0) {
    return null; // Don't render anything if no pending invites
  }

  const renderInviteItem = ({ item }: { item: InviteRow }) => {
    const roleBadgeColor = ROLE_BADGE_COLORS[item.role] ?? ROLE_BADGE_COLORS.member;
    const isAccepting = accepting === item.id;

    return (
      <Box
        px="$4"
        py="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderLight200"
        bg="$backgroundLight0"
      >
        <HStack space="md" alignItems="center" justifyContent="space-between">
          <VStack space="xs" flex={1}>
            <Text size="md" fontWeight="$medium" color="$textLight900">
              {orgNames[item.org_id] ?? 'Organization'}
            </Text>
            <HStack space="sm" alignItems="center">
              <Badge
                size="sm"
                variant="solid"
                bg={roleBadgeColor.bg}
                borderRadius="$md"
                px="$2"
                py="$1"
              >
                <BadgeText size="xs" color={roleBadgeColor.text}>
                  {ROLE_LABELS[item.role] ?? item.role}
                </BadgeText>
              </Badge>
            </HStack>
          </VStack>
          <Button
            size="sm"
            variant="solid"
            action="primary"
            onPress={() => handleAccept(item)}
            isDisabled={isAccepting}
          >
            <ButtonText size="sm">{isAccepting ? 'Accepting…' : 'Accept'}</ButtonText>
          </Button>
        </HStack>
      </Box>
    );
  };

  return (
    <Card size="md" variant="outline" style={styles.card}>
      <VStack space="sm">
        <Box px="$4" pt="$4" pb="$2">
          <Heading size="sm" color="$textLight900">
            Pending Invites
          </Heading>
        </Box>
        <FlatList
          data={invites}
          keyExtractor={(item) => item.id}
          renderItem={renderInviteItem}
          scrollEnabled={false}
        />
      </VStack>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
});
