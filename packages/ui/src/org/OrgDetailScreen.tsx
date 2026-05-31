import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
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
  FormControlLabel,
  FormControlError,
  FormControlErrorText,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Heading,
  Icon,
  CloseIcon,
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
import type { OrgMember, OrgRole, InviteMemberInput, InviteRow } from '@mealme/api';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrgDetailScreenProps {
  /** The organization ID to display. */
  orgId: string;
  /** Navigate to org settings screen. */
  onSettingsPress: (orgId: string) => void;
  /** Navigate back. */
  onBack?: () => void;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgDetailScreen({ orgId, onSettingsPress }: OrgDetailScreenProps) {
  const { currentOrg, members, invites, loading, error, switchOrg, inviteMember, removeMember } =
    useOrg();

  // ----- Invite modal state -----
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTab, setInviteTab] = useState<'email' | 'link'>('email');

  // Email invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('member');
  const [emailError, setEmailError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [lastInviteResult, setLastInviteResult] = useState<InviteRow | null>(null);

  // Share link state
  const [shareLinkRole, setShareLinkRole] = useState<OrgRole>('member');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<InviteRow | null>(null);
  const [copied, setCopied] = useState(false);

  // Load the org if it's not the current one
  useEffect(() => {
    if (currentOrg?.id !== orgId) {
      switchOrg(orgId);
    }
  }, [orgId, currentOrg, switchOrg]);

  // Reset modal state when opening
  const openInviteModal = useCallback(() => {
    setInviteEmail('');
    setInviteRole('member');
    setEmailError('');
    setLastInviteResult(null);
    setShareLinkRole('member');
    setGeneratedInvite(null);
    setCopied(false);
    setInviteTab('email');
    setShowInviteModal(true);
  }, []);

  // ----- Email invite -----
  const handleEmailInvite = useCallback(async () => {
    if (!inviteEmail.trim()) {
      setEmailError('Email is required');
      return;
    }
    setEmailError('');
    setInviting(true);
    setLastInviteResult(null);

    const input: InviteMemberInput = {
      orgId,
      email: inviteEmail.trim(),
      role: inviteRole,
    };

    const result = await inviteMember(input);

    setInviting(false);

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    if (result.invite) {
      setLastInviteResult(result.invite);
    }

    setInviteEmail('');
    setInviteRole('member');
  }, [inviteEmail, inviteRole, orgId, inviteMember]);

  // ----- Share link invite -----
  const handleGenerateLink = useCallback(async () => {
    setGeneratingLink(true);
    setGeneratedInvite(null);
    setCopied(false);

    // Generate a placeholder email for link-only invites
    const placeholderEmail = `link-invite-${Date.now()}@placeholder.mealme.app`;

    const input: InviteMemberInput = {
      orgId,
      email: placeholderEmail,
      role: shareLinkRole,
    };

    const result = await inviteMember(input);

    setGeneratingLink(false);

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    if (result.invite) {
      setGeneratedInvite(result.invite);
    }
  }, [orgId, shareLinkRole, inviteMember]);

  // ----- Copy link -----
  const handleCopyLink = useCallback(async (invite: InviteRow) => {
    const url = buildInviteUrl(invite.invite_token);
    try {
      await copyToClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  }, []);

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
            <Badge size="sm" variant="solid" bg={roleColor.bg} borderRadius="$md" px="$2" py="$1">
              <BadgeText size="xs" color={roleColor.text}>
                {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
              </BadgeText>
            </Badge>
            {/* Don't show remove for the owner */}
            {item.role !== 'owner' && (
              <Button
                size="sm"
                variant="outline"
                action="negative"
                onPress={() => handleRemoveMember(item)}
              >
                <ButtonText size="sm">Remove</ButtonText>
              </Button>
            )}
          </HStack>
        </HStack>
      </Box>
    );
  };

  const renderPendingInviteItem = ({ item }: { item: InviteRow }) => {
    const roleColor = ROLE_COLORS[item.role] ?? ROLE_COLORS.member;
    const inviteUrl = buildInviteUrl(item.invite_token);

    return (
      <Box
        px="$4"
        py="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderLight200"
        bg="$backgroundLight50"
      >
        <HStack space="md" alignItems="center" justifyContent="space-between">
          <VStack space="xs" flex={1}>
            <HStack space="sm" alignItems="center">
              <Text size="md" fontWeight="$medium" color="$textLight900">
                {item.email}
              </Text>
              <Badge size="sm" variant="solid" bg="$warning100" borderRadius="$md" px="$2" py="$1">
                <BadgeText size="xs" color="$warning700">
                  Pending
                </BadgeText>
              </Badge>
            </HStack>
            <HStack space="sm" alignItems="center">
              <Badge size="sm" variant="solid" bg={roleColor.bg} borderRadius="$md" px="$2" py="$1">
                <BadgeText size="xs" color={roleColor.text}>
                  {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                </BadgeText>
              </Badge>
              <Text size="xs" color="$textLight400" numberOfLines={1} ellipsizeMode="middle">
                {inviteUrl}
              </Text>
            </HStack>
          </VStack>
          <Button size="sm" variant="outline" action="primary" onPress={() => handleCopyLink(item)}>
            <ButtonText size="xs">Copy Link</ButtonText>
          </Button>
        </HStack>
      </Box>
    );
  };

  const renderEmpty = () => (
    <VStack space="md" alignItems="center" py="$8" px="$4">
      <Text size="lg" color="$textLight500">
        No members yet
      </Text>
      <Text size="sm" color="$textLight400" textAlign="center">
        Invite members to your organization.
      </Text>
    </VStack>
  );

  if (loading && !currentOrg) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="large" color="$primary500" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Box
        px="$4"
        py="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderLight200"
        bg="$backgroundLight0"
      >
        <HStack space="md" alignItems="center" justifyContent="space-between">
          <VStack space="xs" flex={1}>
            <Heading size="md" color="$textLight900">
              {currentOrg?.name ?? 'Organization'}
            </Heading>
            {error && (
              <Text size="xs" color="$error600">
                {error}
              </Text>
            )}
          </VStack>
          <Button size="sm" variant="outline" onPress={() => onSettingsPress(orgId)}>
            <ButtonText size="sm">Settings</ButtonText>
          </Button>
        </HStack>
      </Box>

      {/* Invite Button */}
      <Box px="$4" py="$3">
        <Button
          size="md"
          variant="outline"
          action="primary"
          onPress={openInviteModal}
          style={styles.inviteButton}
        >
          <ButtonText>Invite Member</ButtonText>
        </Button>
      </Box>

      {/* Members List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.membershipId}
        renderItem={renderMemberItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={members.length === 0 ? styles.emptyList : undefined}
      />

      {/* Pending Invites (shown below members) */}
      {invites.length > 0 && (
        <Box borderTopWidth={1} borderTopColor="$borderLight200" bg="$backgroundLight0">
          <Box px="$4" py="$2">
            <Text size="sm" fontWeight="$semibold" color="$textLight600">
              Pending Invites ({invites.length})
            </Text>
          </Box>
          <FlatList
            data={invites}
            keyExtractor={(item) => item.id}
            renderItem={renderPendingInviteItem}
            scrollEnabled={false}
          />
        </Box>
      )}

      {/* Invite Member Modal with Tabs */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">Invite Member</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md" mt="$2">
              {/* Tab Toggle */}
              <HStack space="sm">
                <Button
                  size="sm"
                  variant={inviteTab === 'email' ? 'solid' : 'outline'}
                  action="primary"
                  flex={1}
                  onPress={() => setInviteTab('email')}
                >
                  <ButtonText>Email Invite</ButtonText>
                </Button>
                <Button
                  size="sm"
                  variant={inviteTab === 'link' ? 'solid' : 'outline'}
                  action="primary"
                  flex={1}
                  onPress={() => setInviteTab('link')}
                >
                  <ButtonText>Share Link</ButtonText>
                </Button>
              </HStack>

              {/* Email Invite Tab */}
              {inviteTab === 'email' && (
                <>
                  {lastInviteResult ? (
                    // Success state — show invite link
                    <VStack space="md">
                      <Box
                        bg="$success50"
                        borderRadius="$md"
                        p="$3"
                        borderWidth={1}
                        borderColor="$success300"
                      >
                        <Text size="sm" color="$success700" fontWeight="$medium">
                          ✓ Invite sent successfully!
                        </Text>
                      </Box>
                      <FormControl>
                        <FormControlLabel>
                          <Text size="sm" fontWeight="$medium" color="$textLight900">
                            Invite Link
                          </Text>
                        </FormControlLabel>
                        <Input variant="outline" size="md">
                          <InputField
                            value={buildInviteUrl(lastInviteResult.invite_token)}
                            editable={false}
                            aria-label="Invite link"
                          />
                        </Input>
                      </FormControl>
                      <Button
                        size="sm"
                        variant="outline"
                        action="primary"
                        onPress={() => handleCopyLink(lastInviteResult)}
                      >
                        <ButtonText>{copied ? 'Copied!' : 'Copy Invite Link'}</ButtonText>
                      </Button>
                      <Button
                        size="sm"
                        variant="link"
                        onPress={() => {
                          setLastInviteResult(null);
                          setInviteEmail('');
                          setInviteRole('member');
                        }}
                      >
                        <ButtonText>Send Another Invite</ButtonText>
                      </Button>
                    </VStack>
                  ) : (
                    // Default email invite form
                    <VStack space="md">
                      <FormControl isInvalid={!!emailError}>
                        <FormControlLabel>
                          <Text size="sm" fontWeight="$medium" color="$textLight900">
                            Email
                          </Text>
                        </FormControlLabel>
                        <Input variant="outline" size="md">
                          <InputField
                            placeholder="Enter email address"
                            value={inviteEmail}
                            onChangeText={(text: string) => {
                              setInviteEmail(text);
                              setEmailError('');
                            }}
                            editable={!inviting}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            aria-label="Email address"
                          />
                        </Input>
                        {emailError && (
                          <FormControlError>
                            <FormControlErrorText>{emailError}</FormControlErrorText>
                          </FormControlError>
                        )}
                      </FormControl>

                      <FormControl>
                        <FormControlLabel>
                          <Text size="sm" fontWeight="$medium" color="$textLight900">
                            Role
                          </Text>
                        </FormControlLabel>
                        <Select
                          selectedValue={inviteRole}
                          onValueChange={(val: string) => setInviteRole(val as OrgRole)}
                        >
                          <SelectTrigger variant="outline" size="md">
                            <SelectInput placeholder="Select role" />
                            <SelectIcon>
                              <Icon as={ChevronDownIcon} />
                            </SelectIcon>
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} label={opt.label} value={opt.value} />
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </VStack>
                  )}
                </>
              )}

              {/* Share Link Tab */}
              {inviteTab === 'link' && (
                <VStack space="md">
                  <FormControl>
                    <FormControlLabel>
                      <Text size="sm" fontWeight="$medium" color="$textLight900">
                        Role
                      </Text>
                    </FormControlLabel>
                    <Select
                      selectedValue={shareLinkRole}
                      onValueChange={(val: string) => {
                        setShareLinkRole(val as OrgRole);
                        setGeneratedInvite(null);
                      }}
                    >
                      <SelectTrigger variant="outline" size="md">
                        <SelectInput placeholder="Select role" />
                        <SelectIcon>
                          <Icon as={ChevronDownIcon} />
                        </SelectIcon>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} label={opt.label} value={opt.value} />
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>

                  {!generatedInvite ? (
                    <VStack space="md">
                      <Text size="xs" color="$textLight500" textAlign="center">
                        Anyone with this link can join as{' '}
                        {shareLinkRole.charAt(0).toUpperCase() + shareLinkRole.slice(1)}. Link
                        expires in 7 days.
                      </Text>
                      <Button size="md" onPress={handleGenerateLink} isDisabled={generatingLink}>
                        <ButtonText>
                          {generatingLink ? 'Generating...' : 'Generate Link'}
                        </ButtonText>
                      </Button>
                    </VStack>
                  ) : (
                    <VStack space="md">
                      <Box
                        bg="$success50"
                        borderRadius="$md"
                        p="$3"
                        borderWidth={1}
                        borderColor="$success300"
                      >
                        <Text size="sm" color="$success700" fontWeight="$medium">
                          ✓ Invite link generated!
                        </Text>
                      </Box>
                      <FormControl>
                        <FormControlLabel>
                          <Text size="sm" fontWeight="$medium" color="$textLight900">
                            Invite Link
                          </Text>
                        </FormControlLabel>
                        <Input variant="outline" size="md">
                          <InputField
                            value={buildInviteUrl(generatedInvite.invite_token)}
                            editable={false}
                            aria-label="Generated invite link"
                          />
                        </Input>
                      </FormControl>
                      <Text size="xs" color="$textLight500" textAlign="center">
                        Anyone with this link can join as{' '}
                        {shareLinkRole.charAt(0).toUpperCase() + shareLinkRole.slice(1)}. Link
                        expires in 7 days.
                      </Text>
                      <HStack space="sm">
                        <Button
                          size="sm"
                          variant="solid"
                          action="primary"
                          flex={1}
                          onPress={() => handleCopyLink(generatedInvite)}
                        >
                          <ButtonText>{copied ? 'Copied!' : 'Copy Link'}</ButtonText>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          flex={1}
                          onPress={() => {
                            setGeneratedInvite(null);
                            setCopied(false);
                          }}
                        >
                          <ButtonText>Generate New</ButtonText>
                        </Button>
                      </HStack>
                    </VStack>
                  )}
                </VStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowInviteModal(false)}
              isDisabled={inviting || generatingLink}
            >
              <ButtonText>Close</ButtonText>
            </Button>
            {/* Only show Send button on email tab when no success state */}
            {inviteTab === 'email' && !lastInviteResult && (
              <Button size="sm" onPress={handleEmailInvite} isDisabled={inviting} ml="$3">
                <ButtonText>{inviting ? 'Inviting...' : 'Invite'}</ButtonText>
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
  },
  inviteButton: {
    width: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
