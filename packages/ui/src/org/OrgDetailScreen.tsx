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
import type { OrgMember, OrgRole, InviteMemberInput } from '@mealme/api';

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
];

const ROLE_COLORS: Record<OrgRole, { bg: string; text: string }> = {
  owner: { bg: '$warning100', text: '$warning700' },
  admin: { bg: '$info100', text: '$info700' },
  member: { bg: '$backgroundLight200', text: '$textLight700' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgDetailScreen({ orgId, onSettingsPress }: OrgDetailScreenProps) {
  const {
    currentOrg,
    members,
    loading,
    error,
    switchOrg,
    inviteMember,
    removeMember,
  } = useOrg();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('member');
  const [emailError, setEmailError] = useState('');
  const [inviting, setInviting] = useState(false);

  // Load the org if it's not the current one
  useEffect(() => {
    if (currentOrg?.id !== orgId) {
      switchOrg(orgId);
    }
  }, [orgId, currentOrg, switchOrg]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) {
      setEmailError('Email is required');
      return;
    }
    setEmailError('');
    setInviting(true);

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

    setInviteEmail('');
    setInviteRole('member');
    setShowInviteModal(false);
  }, [inviteEmail, inviteRole, orgId, inviteMember]);

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
          onPress={() => setShowInviteModal(true)}
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

      {/* Invite Member Modal */}
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
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowInviteModal(false)}
              isDisabled={inviting}
              mr="$3"
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button size="sm" onPress={handleInvite} isDisabled={inviting}>
              <ButtonText>{inviting ? 'Inviting...' : 'Invite'}</ButtonText>
            </Button>
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
