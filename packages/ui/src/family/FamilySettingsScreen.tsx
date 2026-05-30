import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
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
} from '@gluestack-ui/themed';
import { useFamily } from '@mealme/api';
import type { FamilyMember, FamilyRole } from '@mealme/api';

export interface FamilySettingsScreenProps {
  /** The family ID to manage. */
  familyId: string;
  /** Navigate back. */
  onBack?: () => void;
  /** Called after family is deleted. */
  onFamilyDeleted?: () => void;
}

const ROLE_OPTIONS: { label: string; value: FamilyRole }[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Parent', value: 'parent' },
  { label: 'Guardian', value: 'guardian' },
  { label: 'Member', value: 'member' },
  { label: 'Child', value: 'child' },
];

export function FamilySettingsScreen({
  familyId,
  onFamilyDeleted,
}: FamilySettingsScreenProps) {
  const {
    currentFamily,
    members,
    loading,
    error,
    switchFamily,
    updateFamily,
    deleteFamily,
    removeFamilyMember,
    updateFamilyMemberRole,
  } = useFamily();

  const [editName, setEditName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load the family if it's not the current one
  useEffect(() => {
    if (currentFamily?.id !== familyId) {
      switchFamily(familyId);
    }
  }, [familyId, currentFamily, switchFamily]);

  // Sync edit name with current family
  useEffect(() => {
    if (currentFamily) {
      setEditName(currentFamily.name);
    }
  }, [currentFamily]);

  const handleSaveName = useCallback(async () => {
    if (!editName.trim()) {
      setNameError('Family name is required');
      return;
    }
    setNameError('');
    setSaving(true);

    const result = await updateFamily(familyId, { name: editName.trim() });
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', 'Family name updated');
    }
  }, [editName, familyId, updateFamily]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Family',
      'Are you sure you want to delete this family? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const result = await deleteFamily(familyId);
            setDeleting(false);

            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              onFamilyDeleted?.();
            }
          },
        },
      ],
    );
  }, [familyId, deleteFamily, onFamilyDeleted]);

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

  const handleRoleChange = useCallback(
    async (member: FamilyMember, newRole: FamilyRole) => {
      const result = await updateFamilyMemberRole({
        familyId,
        userId: member.userId,
        role: newRole,
      });
      if (result.error) {
        Alert.alert('Error', result.error);
      }
    },
    [familyId, updateFamilyMemberRole],
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
          <Text size="md" fontWeight="$medium" color="$textLight900">
            {item.fullName ?? 'Unknown User'}
          </Text>
        </VStack>
        <HStack space="sm" alignItems="center">
          {/* Role selector - don't allow changing owner role */}
          {item.role !== 'owner' ? (
            <Select
              selectedValue={item.role}
              onValueChange={(val: string) => handleRoleChange(item, val as FamilyRole)}
            >
              <SelectTrigger variant="outline" size="sm" style={styles.roleSelect}>
                <SelectInput />
                <SelectIcon>
                  <ChevronDownIcon size="xs" />
                </SelectIcon>
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.filter((opt) => opt.value !== 'owner').map((opt) => (
                  <SelectItem key={opt.value} label={opt.label} value={opt.value} />
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Text size="sm" color="$textLight500" fontWeight="$medium">
              Owner
            </Text>
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

  if (loading && !currentFamily) {
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
        <Box bg="$error50" px="$4" py="$3" borderRadius="$md" borderWidth={1} borderColor="$error500" mb="$4">
          <Text size="sm" color="$error600">{error}</Text>
        </Box>
      )}

      {/* Edit Family Name Section */}
      <Box bg="$backgroundLight0" borderRadius="$lg" p="$4" mb="$4" borderWidth={1} borderColor="$borderLight200">
        <Heading size="sm" mb="$3" color="$textLight900">
          Family Name
        </Heading>
        <FormControl isInvalid={!!nameError}>
          <Input variant="outline" size="md" mb="$2">
            <InputField
              value={editName}
              onChangeText={(text: string) => {
                setEditName(text);
                setNameError('');
              }}
              editable={!saving}
              aria-label="Family name"
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
          isDisabled={saving || editName === currentFamily?.name}
          mt="$2"
        >
          <ButtonText>{saving ? 'Saving...' : 'Save Name'}</ButtonText>
        </Button>
      </Box>

      {/* Members Section */}
      <Box bg="$backgroundLight0" borderRadius="$lg" borderWidth={1} borderColor="$borderLight200" mb="$4">
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

      {/* Danger Zone */}
      <Box bg="$backgroundLight0" borderRadius="$lg" p="$4" borderWidth={1} borderColor="$error300">
        <Heading size="sm" mb="$2" color="$error600">
          Danger Zone
        </Heading>
        <Text size="sm" color="$textLight500" mb="$3">
          Deleting a family is permanent and cannot be undone. All associated
          meal plans, shopping lists, and preferences will be lost.
        </Text>
        <Button
          size="sm"
          variant="solid"
          action="negative"
          onPress={handleDelete}
          isDisabled={deleting}
        >
          <ButtonText>{deleting ? 'Deleting...' : 'Delete Family'}</ButtonText>
        </Button>
      </Box>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSelect: {
    minWidth: 100,
  },
});
