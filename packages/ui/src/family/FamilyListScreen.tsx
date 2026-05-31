import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import {
  Box,
  Text,
  VStack,
  Button,
  ButtonText,
  ButtonIcon,
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
  AddIcon,
  CloseIcon,
  Spinner,
} from '@gluestack-ui/themed';
import { useFamily } from '@mealme/api';
import type { FamilyWithRole, CreateFamilyInput } from '@mealme/api';

export interface FamilyListScreenProps {
  /** Navigate to family detail screen. */
  onFamilyPress: (familyId: string) => void;
  /** The org ID to scope families to. */
  orgId: string;
}

export function FamilyListScreen({ onFamilyPress, orgId }: FamilyListScreenProps) {
  const { families, loading, error, createFamily, refreshFamilies, setOrgId } = useFamily();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [nameError, setNameError] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Set org ID on mount / when prop changes
  React.useEffect(() => {
    setOrgId(orgId);
  }, [orgId, setOrgId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFamilies();
    setRefreshing(false);
  }, [refreshFamilies]);

  const validateName = (): boolean => {
    if (!newFamilyName.trim()) {
      setNameError('Family name is required');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleCreate = useCallback(async () => {
    if (!validateName()) return;

    setCreating(true);
    const input: CreateFamilyInput = {
      name: newFamilyName.trim(),
      orgId,
    };

    const result = await createFamily(input);
    setCreating(false);

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    setNewFamilyName('');
    setNameError('');
    setShowCreateModal(false);

    // Navigate to the new family
    if (result.family) {
      onFamilyPress(result.family.id);
    }
  }, [newFamilyName, orgId, createFamily, onFamilyPress]);

  const renderFamilyItem = ({ item }: { item: FamilyWithRole }) => (
    <Box
      px="$4"
      py="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderLight200"
      bg="$backgroundLight0"
    >
      <Button variant="link" onPress={() => onFamilyPress(item.id)} style={styles.familyButton}>
        <VStack space="xs" alignItems="flex-start">
          <Text size="md" fontWeight="$semibold" color="$textLight900">
            {item.name}
          </Text>
          <Text size="sm" color="$textLight500">
            {item.role}
          </Text>
        </VStack>
      </Button>
    </Box>
  );

  const renderEmpty = () => (
    <VStack space="md" alignItems="center" py="$8" px="$4">
      <Text size="lg" color="$textLight500">
        No families yet
      </Text>
      <Text size="sm" color="$textLight400" textAlign="center">
        Create a family to start sharing meal plans with your household.
      </Text>
    </VStack>
  );

  return (
    <View style={styles.container}>
      {/* Error Banner */}
      {error && (
        <Box
          bg="$error50"
          px="$4"
          py="$3"
          mx="$4"
          mt="$2"
          borderRadius="$md"
          borderWidth={1}
          borderColor="$error500"
        >
          <Text size="sm" color="$error600">
            {error}
          </Text>
        </Box>
      )}

      {/* Loading State */}
      {loading && families.length === 0 ? (
        <VStack space="md" alignItems="center" justifyContent="center" flex={1}>
          <Spinner size="large" color="$primary500" />
          <Text size="sm" color="$textLight500">
            Loading families...
          </Text>
        </VStack>
      ) : (
        <FlatList
          data={families}
          keyExtractor={(item) => item.id}
          renderItem={renderFamilyItem}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={families.length === 0 ? styles.emptyList : undefined}
        />
      )}

      {/* FAB - Create Family */}
      <Button
        size="lg"
        variant="solid"
        action="primary"
        onPress={() => setShowCreateModal(true)}
        style={styles.fab}
        rounded="$full"
      >
        <ButtonIcon as={AddIcon} />
      </Button>

      {/* Create Family Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">Create Family</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <FormControl isInvalid={!!nameError}>
              <FormControlLabel>
                <Text size="sm" fontWeight="$medium" color="$textLight900">
                  Family Name
                </Text>
              </FormControlLabel>
              <Input variant="outline" size="md">
                <InputField
                  placeholder="e.g., The Smiths"
                  value={newFamilyName}
                  onChangeText={(text: string) => {
                    setNewFamilyName(text);
                    setNameError('');
                  }}
                  editable={!creating}
                  aria-label="Family name"
                />
              </Input>
              {nameError && (
                <FormControlError>
                  <FormControlErrorText>{nameError}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowCreateModal(false)}
              isDisabled={creating}
              mr="$3"
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button size="sm" onPress={handleCreate} isDisabled={creating}>
              <ButtonText>{creating ? 'Creating...' : 'Create'}</ButtonText>
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
  fab: {
    bottom: 24,
    height: 56,
    position: 'absolute',
    right: 24,
    width: 56,
  },
  familyButton: {
    justifyContent: 'flex-start',
    width: '100%',
  },
});
