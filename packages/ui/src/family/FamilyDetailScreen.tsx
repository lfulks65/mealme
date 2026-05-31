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
import { useFamily } from '@mealme/api';
import type { FamilyMember, FamilyRole } from '@mealme/api';
import { getFamilyPreferences } from '@mealme/api';
import type { FamilyPreferences } from '@mealme/api';
import { getDietaryRestrictionLabel, getAllergyLabel } from '@mealme/shared';
import type { DietaryRestriction, AllergyId } from '@mealme/shared';

export interface FamilyDetailScreenProps {
  /** The family ID to display. */
  familyId: string;
  /** Navigate to family settings screen. */
  onSettingsPress: (familyId: string) => void;
  /** Navigate to family preferences screen. */
  onPreferencesPress?: (familyId: string) => void;
  /** Navigate back. */
  onBack?: () => void;
}

const ROLE_OPTIONS: { label: string; value: FamilyRole }[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Parent', value: 'parent' },
  { label: 'Guardian', value: 'guardian' },
  { label: 'Member', value: 'member' },
  { label: 'Child', value: 'child' },
];

export function FamilyDetailScreen({
  familyId,
  onSettingsPress,
  onPreferencesPress,
}: FamilyDetailScreenProps) {
  const {
    currentFamily,
    members,
    loading,
    error,
    switchFamily,
    addFamilyMember,
    removeFamilyMember,
  } = useFamily();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyRole>('member');
  const [userIdError, setUserIdError] = useState('');
  const [inviting, setInviting] = useState(false);

  // ── Family preferences state ──────────────────────────────────────────
  const [familyPreferences, setFamilyPreferences] = useState<FamilyPreferences | null>(null);

  // Load the family if it's not the current one
  useEffect(() => {
    if (currentFamily?.id !== familyId) {
      switchFamily(familyId);
    }
  }, [familyId, currentFamily, switchFamily]);

  // Load family preferences for badges
  useEffect(() => {
    async function loadPrefs() {
      const result = await getFamilyPreferences(familyId);
      if (result.preferences) {
        setFamilyPreferences(result.preferences);
      }
    }
    loadPrefs();
  }, [familyId]);

  const handleInvite = useCallback(async () => {
    if (!inviteUserId.trim()) {
      setUserIdError('User ID or email is required');
      return;
    }
    setUserIdError('');
    setInviting(true);

    const result = await addFamilyMember({
      familyId,
      userId: inviteUserId.trim(),
      role: inviteRole,
    });

    setInviting(false);

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    setInviteUserId('');
    setInviteRole('member');
    setShowInviteModal(false);
  }, [inviteUserId, inviteRole, familyId, addFamilyMember]);

  const handleRemoveMember = useCallback(
    (member: FamilyMember) => {
      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${member.fullName ?? 'this member'} from the family?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const result = await removeFamilyMember(familyId, member.userId);
              if (result.error) {
                Alert.alert('Error', result.error);
              }
            },
          },
        ],
      );
    },
    [familyId, removeFamilyMember],
  );

  const renderMemberItem = ({ item }: { item: FamilyMember }) => (
    <Box
      px="$4"
      py="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderLight200"
      bg="$backgroundLight0"
    >
      <HStack space="md" alignItems="center" justifyContent="space-between">
        <VStack space="xs" flex={1}>
          <HStack space="sm" alignItems="center" flexWrap="wrap">
            <Text size="md" fontWeight="$medium" color="$textLight900">
              {item.fullName ?? 'Unknown User'}
            </Text>
          </HStack>
          <Text size="sm" color="$textLight500">
            {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
          </Text>
        </VStack>
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
    </Box>
  );

  const renderEmpty = () => (
    <VStack space="md" alignItems="center" py="$8" px="$4">
      <Text size="lg" color="$textLight500">
        No members yet
      </Text>
      <Text size="sm" color="$textLight400" textAlign="center">
        Invite members to your family.
      </Text>
    </VStack>
  );

  if (loading && !currentFamily) {
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
            <HStack space="sm" alignItems="center" flexWrap="wrap">
              <Heading size="md" color="$textLight900">
                {currentFamily?.name ?? 'Family'}
              </Heading>
              {/* Preference badges — only show if preferences exist */}
              {familyPreferences &&
                familyPreferences.dietaryRestrictions.length > 0 &&
                familyPreferences.dietaryRestrictions.slice(0, 3).map((key: DietaryRestriction) => (
                  <Badge key={key} size="sm" variant="solid" action="success" borderRadius="$full">
                    <BadgeText>{getDietaryRestrictionLabel(key)}</BadgeText>
                  </Badge>
                ))}
              {familyPreferences &&
                familyPreferences.allergies.length > 0 &&
                familyPreferences.allergies.slice(0, 2).map((id: AllergyId) => (
                  <Badge key={id} size="sm" variant="solid" action="error" borderRadius="$full">
                    <BadgeText>{getAllergyLabel(id)}</BadgeText>
                  </Badge>
                ))}
              {familyPreferences &&
                (familyPreferences.dietaryRestrictions.length > 3 ||
                  familyPreferences.allergies.length > 2) && (
                  <Badge size="sm" variant="outline" action="muted" borderRadius="$full">
                    <BadgeText>
                      +
                      {Math.max(0, familyPreferences.dietaryRestrictions.length - 3) +
                        Math.max(0, familyPreferences.allergies.length - 2)}
                    </BadgeText>
                  </Badge>
                )}
            </HStack>
            {error && (
              <Text size="xs" color="$error600">
                {error}
              </Text>
            )}
          </VStack>
          <Button size="sm" variant="outline" onPress={() => onSettingsPress(familyId)}>
            <ButtonText size="sm">Settings</ButtonText>
          </Button>
          {onPreferencesPress && (
            <Button
              size="sm"
              variant="outline"
              action="primary"
              onPress={() => onPreferencesPress(familyId)}
            >
              <ButtonText size="sm">Preferences</ButtonText>
            </Button>
          )}
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
              <FormControl isInvalid={!!userIdError}>
                <FormControlLabel>
                  <Text size="sm" fontWeight="$medium" color="$textLight900">
                    User ID or Email
                  </Text>
                </FormControlLabel>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="Enter user ID or email"
                    value={inviteUserId}
                    onChangeText={(text: string) => {
                      setInviteUserId(text);
                      setUserIdError('');
                    }}
                    editable={!inviting}
                    aria-label="User ID or email"
                  />
                </Input>
                {userIdError && (
                  <FormControlError>
                    <FormControlErrorText>{userIdError}</FormControlErrorText>
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
                  onValueChange={(val: string) => setInviteRole(val as FamilyRole)}
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
