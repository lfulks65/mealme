import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView } from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  Input,
  InputField,
  FormControl,
  FormControlError,
  FormControlErrorText,
  Heading,
  Spinner,
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  ChevronDownIcon,
  SelectContent,
  SelectItem,
  Badge,
  BadgeText,
} from '@gluestack-ui/themed';
import { useOrg } from '@mealme/api';
import type { OrgMember, OrgRole, InviteRow, UpdateMemberRoleInput } from '@mealme/api';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrgSettingsScreenProps {
  /** The organization ID to manage. */
  orgId: string;
  /** Navigate back. */
  onBack?: () => void;
  /** Called after org is deleted. */
  onOrgDeleted?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS: { label: string; value: OrgRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Member', value: 'member' },
  { label: 'Viewer', value: 'viewer' },
];

const ROLE_COLORS: Record<OrgRole, { bg: string; text: string }> = {
  owner: { bg: '$warning100', text: '$warning700' },
  admin: { bg: '$info100', text: '$info700' },
  member: { bg: '$backgroundLight200', text: '$textLight700' },
  viewer: { bg: '$backgroundLight100', text: '$textLight500' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the site URL for building invite links. */
function getSiteUrl(): string {
  if (typeof process === 'undefined') return '';
  return (
    process.env.EXPO_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    ''
  );
}

/** Build the full invite URL from a token. */
function buildInviteUrl(token: string): string {
  const base = getSiteUrl();
  return base ? `${base}/invite/${token}` : `/invite/${token}`;
}

/** Copy text to clipboard (works on both RN and web). */
async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const { Clipboard } = require('react-native');
    await Clipboard.setString(text);
  }
}

/** Format a relative expiry countdown (e.g., "Expires in 3 days"). */
function formatExpiryCountdown(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Expired';
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 1) {
    return `Expires in ${diffDays} days`;
  }
  if (diffDays === 1) {
    return `Expires in 1 day${diffHours > 0 ? ` ${diffHours}h` : ''}`;
  }
  if (diffHours > 1) {
    return `Expires in ${diffHours} hours`;
  }
  if (diffHours === 1) {
    return 'Expires in 1 hour';
  }
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `Expires in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
}

/** Check if an email is a placeholder (link-only invite). */
function isPlaceholderEmail(email: string): boolean {
  return email.endsWith('@placeholder.mealme.app');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgSettingsScreen({ orgId, onOrgDeleted }: OrgSettingsScreenProps) {
  const {
    currentOrg,
    members,
    invites,
    loading,
    error,
    switchOrg,
    updateOrg,
    deleteOrg,
    removeMember,
    updateMemberRole,
    revokeInvite,
  } = useOrg();

  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [nameError, setNameError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Load the org if it's not the current one
  useEffect(() => {
    if (currentOrg?.id !== orgId) {
      switchOrg(orgId);
    }
  }, [orgId, currentOrg, switchOrg]);

  // Sync edit fields with current org
  useEffect(() => {
    if (currentOrg) {
      setEditName(currentOrg.name);
      setEditSlug(currentOrg.slug);
    }
  }, [currentOrg]);

  // ----- Save name -----
  const handleSaveName = useCallback(async () => {
    if (!editName.trim()) {
      setNameError('Organization name is required');
      return;
    }
    setNameError('');
    setSavingName(true);

    const result = await updateOrg(orgId, { name: editName.trim() });
    setSavingName(false);

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', 'Organization name updated');
    }
  }, [editName, orgId, updateOrg]);

  // ----- Save slug -----
  const handleSaveSlug = useCallback(async () => {
    if (!editSlug.trim()) {
      setSlugError('Slug is required');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(editSlug.trim())) {
      setSlugError('Slug must be lowercase letters, numbers, and hyphens only');
      return;
    }
    setSlugError('');
    setSavingSlug(true);

    const result = await updateOrg(orgId, { slug: editSlug.trim() });
    setSavingSlug(false);

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', 'Organization slug updated');
    }
  }, [editSlug, orgId, updateOrg]);

  // ----- Delete org -----
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Organization',
      'Are you sure you want to delete this organization? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const result = await deleteOrg(orgId);
            setDeleting(false);

            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              onOrgDeleted?.();
            }
          },
        },
      ],
    );
  }, [orgId, deleteOrg, onOrgDeleted]);

  // ----- Remove member -----
  const handleRemoveMember = useCallback(
    (member: OrgMember) => {
      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${member.fullName ?? 'this member'} from the organization?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const result = await removeMember(member.userId);
              if (result.error) {
                Alert.alert('Error', result.error);
              }
            },
          },
        ],
      );
    },
    [removeMember],
  );

  // ----- Role change -----
  const handleRoleChange = useCallback(
    async (member: OrgMember, newRole: OrgRole) => {
      const input: UpdateMemberRoleInput = {
        orgId,
        userId: member.userId,
        role: newRole,
      };
      const result = await updateMemberRole(input);
      if (result.error) {
        Alert.alert('Error', result.error);
      }
    },
    [orgId, updateMemberRole],
  );

  // ----- Copy invite link -----
  const handleCopyInviteLink = useCallback(async (invite: InviteRow) => {
    const url = buildInviteUrl(invite.invite_token);
    try {
      await copyToClipboard(url);
      Alert.alert('Copied', 'Invite link copied to clipboard');
    } catch {
      Alert.alert('Error', 'Failed to copy link');
    }
  }, []);

  // ----- Revoke invite -----
  const handleRevokeInvite = useCallback(
    (invite: InviteRow) => {
      Alert.alert(
        'Revoke Invite',
        `Are you sure you want to revoke the invite for ${isPlaceholderEmail(invite.email) ? 'this shareable link' : invite.email}? The link will no longer work.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Revoke',
            style: 'destructive',
            onPress: async () => {
              setRevokingId(invite.id);
              const result = await revokeInvite(invite.id);
              setRevokingId(null);
              if (result.error) {
                Alert.alert('Error', result.error);
              }
            },
          },
        ],
      );
    },
    [revokeInvite],
  );

  // ----- Renderers -----
  const renderMemberItem = ({ item }: { item: OrgMember }) => {
    const roleColor = ROLE_COLORS[item.role] ?? ROLE_COLORS.member;

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
              {item.fullName ?? 'Unknown User'}
            </Text>
          </VStack>
          <HStack space="sm" alignItems="center">
            {/* Role selector - don't allow changing owner role */}
            {item.role !== 'owner' ? (
              <Select
                selectedValue={item.role}
                onValueChange={(val: string) => handleRoleChange(item, val as OrgRole)}
              >
                <SelectTrigger variant="outline" size="sm" style={styles.roleSelect}>
                  <SelectInput />
                  <SelectIcon>
                    <ChevronDownIcon size="xs" />
                  </SelectIcon>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} label={opt.label} value={opt.value} />
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge size="sm" variant="solid" bg={roleColor.bg} borderRadius="$md" px="$2" py="$1">
                <BadgeText size="xs" color={roleColor.text}>
                  Owner
                </BadgeText>
              </Badge>
            )}
            {/* Remove button - don't allow removing owner */}
            {item.role !== 'owner' && (
              <Button
                size="sm"
                variant="outline"
                action="negative"
                onPress={() => handleRemoveMember(item)}
              >
                <ButtonText size="xs">Remove</ButtonText>
              </Button>
            )}
          </HStack>
        </HStack>
      </Box>
    );
  };

  const renderInviteItem = ({ item }: { item: InviteRow }) => {
    const roleColor = ROLE_COLORS[item.role] ?? ROLE_COLORS.member;
    const isExpired = new Date(item.expires_at) < new Date();
    const isLink = isPlaceholderEmail(item.email);
    const isRevoking = revokingId === item.id;
    const truncatedToken = item.invite_token ? `${item.invite_token.slice(0, 8)}...` : '';

    return (
      <Box
        px="$4"
        py="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderLight200"
        bg="$backgroundLight0"
      >
        <VStack space="sm">
          <HStack space="md" alignItems="center" justifyContent="space-between">
            <VStack space="xs" flex={1}>
              <HStack space="sm" alignItems="center">
                <Text size="md" fontWeight="$medium" color="$textLight900">
                  {isLink ? 'Shareable link' : item.email}
                </Text>
                {isExpired ? (
                  <Badge
                    size="sm"
                    variant="solid"
                    bg="$error100"
                    borderRadius="$md"
                    px="$2"
                    py="$1"
                  >
                    <BadgeText size="xs" color="$error700">
                      Expired
                    </BadgeText>
                  </Badge>
                ) : (
                  <Badge
                    size="sm"
                    variant="solid"
                    bg="$warning100"
                    borderRadius="$md"
                    px="$2"
                    py="$1"
                  >
                    <BadgeText size="xs" color="$warning700">
                      Pending
                    </BadgeText>
                  </Badge>
                )}
              </HStack>
              <HStack space="sm" alignItems="center">
                <Badge
                  size="sm"
                  variant="solid"
                  bg={roleColor.bg}
                  borderRadius="$md"
                  px="$2"
                  py="$1"
                >
                  <BadgeText size="xs" color={roleColor.text}>
                    {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                  </BadgeText>
                </Badge>
                <Text size="xs" color={isExpired ? '$error500' : '$textLight500'}>
                  {isExpired ? 'Expired' : formatExpiryCountdown(item.expires_at)}
                </Text>
              </HStack>
              {truncatedToken && (
                <Text size="xs" color="$textLight400">
                  Token: {truncatedToken}
                </Text>
              )}
            </VStack>
          </HStack>
          <HStack space="sm" justifyContent="flex-end">
            <Button
              size="sm"
              variant="outline"
              action="primary"
              onPress={() => handleCopyInviteLink(item)}
            >
              <ButtonText size="xs">Copy Link</ButtonText>
            </Button>
            <Button
              size="sm"
              variant="outline"
              action="negative"
              onPress={() => handleRevokeInvite(item)}
              isDisabled={isRevoking}
            >
              <ButtonText size="xs">{isRevoking ? 'Revoking...' : 'Revoke'}</ButtonText>
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  };

  if (loading && !currentOrg) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color="$primary500" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Error Banner */}
      {error && (
        <Box
          bg="$error50"
          px="$4"
          py="$3"
          borderRadius="$md"
          borderWidth={1}
          borderColor="$error500"
          mb="$4"
        >
          <Text size="sm" color="$error600">
            {error}
          </Text>
        </Box>
      )}

      {/* Edit Organization Name Section */}
      <Box
        bg="$backgroundLight0"
        borderRadius="$lg"
        p="$4"
        mb="$4"
        borderWidth={1}
        borderColor="$borderLight200"
      >
        <Heading size="sm" mb="$3" color="$textLight900">
          Organization Name
        </Heading>
        <FormControl isInvalid={!!nameError}>
          <Input variant="outline" size="md" mb="$2">
            <InputField
              value={editName}
              onChangeText={(text: string) => {
                setEditName(text);
                setNameError('');
              }}
              editable={!savingName}
              aria-label="Organization name"
            />
          </Input>
          {nameError && (
            <FormControlError>
              <FormControlErrorText>{nameError}</FormControlErrorText>
            </FormControlError>
          )}
        </FormControl>
        <Button
          size="sm"
          onPress={handleSaveName}
          isDisabled={savingName || editName === currentOrg?.name}
          mt="$2"
        >
          <ButtonText>{savingName ? 'Saving...' : 'Save Name'}</ButtonText>
        </Button>
      </Box>

      {/* Edit Organization Slug Section */}
      <Box
        bg="$backgroundLight0"
        borderRadius="$lg"
        p="$4"
        mb="$4"
        borderWidth={1}
        borderColor="$borderLight200"
      >
        <Heading size="sm" mb="$3" color="$textLight900">
          Organization Slug
        </Heading>
        <FormControl isInvalid={!!slugError}>
          <Input variant="outline" size="md" mb="$2">
            <InputField
              value={editSlug}
              onChangeText={(text: string) => {
                setEditSlug(text);
                setSlugError('');
              }}
              editable={!savingSlug}
              autoCapitalize="none"
              autoCorrect={false}
              aria-label="Organization slug"
            />
          </Input>
          {slugError && (
            <FormControlError>
              <FormControlErrorText>{slugError}</FormControlErrorText>
            </FormControlError>
          )}
        </FormControl>
        <Button
          size="sm"
          onPress={handleSaveSlug}
          isDisabled={savingSlug || editSlug === currentOrg?.slug}
          mt="$2"
        >
          <ButtonText>{savingSlug ? 'Saving...' : 'Save Slug'}</ButtonText>
        </Button>
      </Box>

      {/* Members Section */}
      <Box
        bg="$backgroundLight0"
        borderRadius="$lg"
        borderWidth={1}
        borderColor="$borderLight200"
        mb="$4"
      >
        <Box px="$4" pt="$4" pb="$2">
          <Heading size="sm" color="$textLight900">
            Members ({members.length})
          </Heading>
        </Box>
        <FlatList
          data={members}
          keyExtractor={(item) => item.membershipId}
          renderItem={renderMemberItem}
          scrollEnabled={false}
        />
      </Box>

      {/* Pending Invites Section */}
      {invites.length > 0 && (
        <Box
          bg="$backgroundLight0"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderLight200"
          mb="$4"
        >
          <Box px="$4" pt="$4" pb="$2">
            <Heading size="sm" color="$textLight900">
              Pending Invites ({invites.length})
            </Heading>
          </Box>
          <FlatList
            data={invites}
            keyExtractor={(item) => item.id}
            renderItem={renderInviteItem}
            scrollEnabled={false}
          />
        </Box>
      )}

      {/* Danger Zone */}
      <Box bg="$backgroundLight0" borderRadius="$lg" p="$4" borderWidth={1} borderColor="$error300">
        <Heading size="sm" mb="$2" color="$error600">
          Danger Zone
        </Heading>
        <Text size="sm" color="$textLight500" mb="$3">
          Deleting an organization is permanent and cannot be undone. All associated data, members,
          and invites will be lost.
        </Text>
        <Button
          size="sm"
          variant="solid"
          action="negative"
          onPress={handleDelete}
          isDisabled={deleting}
        >
          <ButtonText>{deleting ? 'Deleting...' : 'Delete Organization'}</ButtonText>
        </Button>
      </Box>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  roleSelect: {
    minWidth: 100,
  },
  scrollContent: {
    padding: 16,
  },
});
