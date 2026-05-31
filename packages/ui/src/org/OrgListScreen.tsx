import { useState, useCallback, useRef } from 'react';
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
import { useOrg } from '@mealme/api';
import type { OrgWithRole, CreateOrgInput } from '@mealme/api';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrgListScreenProps {
  /** Navigate to org detail screen. */
  onOrgPress: (orgId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a name string into a URL-safe slug (lowercase, hyphens, no spaces). */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-') // replace non-alphanumeric runs with hyphen
    .replace(/^-+|-+$/g, '') // strip leading/trailing hyphens
    .replace(/--+/g, '-'); // collapse consecutive hyphens
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgListScreen({ onOrgPress }: OrgListScreenProps) {
  const { orgs, loading, error, createOrg, refreshOrgs } = useOrg();

  // ----- Create modal state -----
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [nameError, setNameError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [creating, setCreating] = useState(false);

  // Track whether the user has manually edited the slug so we stop
  // auto-generating it from the name.
  const slugManuallyEdited = useRef(false);

  const [refreshing, setRefreshing] = useState(false);

  // ----- Refresh -----
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshOrgs();
    setRefreshing(false);
  }, [refreshOrgs]);

  // ----- Validation -----
  const validateForm = (): boolean => {
    let valid = true;

    if (!newOrgName.trim()) {
      setNameError('Organization name is required');
      valid = false;
    } else {
      setNameError('');
    }

    if (!newOrgSlug.trim()) {
      setSlugError('Slug is required');
      valid = false;
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newOrgSlug.trim())) {
      setSlugError('Slug must be lowercase letters, numbers, and hyphens only');
      valid = false;
    } else {
      setSlugError('');
    }

    return valid;
  };

  // ----- Create -----
  const handleCreate = useCallback(async () => {
    if (!validateForm()) return;

    setCreating(true);
    const input: CreateOrgInput = {
      name: newOrgName.trim(),
      slug: newOrgSlug.trim(),
    };

    const result = await createOrg(input);
    setCreating(false);

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    // Reset form and close modal
    setNewOrgName('');
    setNewOrgSlug('');
    setNameError('');
    setSlugError('');
    slugManuallyEdited.current = false;
    setShowCreateModal(false);

    // Navigate to the new org
    if (result.org) {
      onOrgPress(result.org.id);
    }
  }, [newOrgName, newOrgSlug, createOrg, onOrgPress]);

  // ----- Name change handler (auto-slugify) -----
  const handleNameChange = useCallback((text: string) => {
    setNewOrgName(text);
    setNameError('');

    if (!slugManuallyEdited.current) {
      setNewOrgSlug(slugify(text));
      setSlugError('');
    }
  }, []);

  // ----- Slug change handler (mark as manually edited) -----
  const handleSlugChange = useCallback((text: string) => {
    slugManuallyEdited.current = true;
    setNewOrgSlug(text);
    setSlugError('');
  }, []);

  // ----- Reset modal state on open -----
  const openCreateModal = useCallback(() => {
    setNewOrgName('');
    setNewOrgSlug('');
    setNameError('');
    setSlugError('');
    slugManuallyEdited.current = false;
    setShowCreateModal(true);
  }, []);

  // ----- Renderers -----
  const renderOrgItem = ({ item }: { item: OrgWithRole }) => (
    <Box
      px="$4"
      py="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderLight200"
      bg="$backgroundLight0"
    >
      <Button variant="link" onPress={() => onOrgPress(item.id)} style={styles.orgButton}>
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
        No organizations yet
      </Text>
      <Text size="sm" color="$textLight400" textAlign="center">
        Create one to get started.
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
      {loading && orgs.length === 0 ? (
        <VStack space="md" alignItems="center" justifyContent="center" flex={1}>
          <Spinner size="large" color="$primary500" />
          <Text size="sm" color="$textLight500">
            Loading organizations...
          </Text>
        </VStack>
      ) : (
        <FlatList
          data={orgs}
          keyExtractor={(item: OrgWithRole) => item.id}
          renderItem={renderOrgItem}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={orgs.length === 0 ? styles.emptyList : undefined}
        />
      )}

      {/* FAB - Create Organization */}
      <Button
        size="lg"
        variant="solid"
        action="primary"
        onPress={openCreateModal}
        style={styles.fab}
        rounded="$full"
      >
        <ButtonIcon as={AddIcon} />
      </Button>

      {/* Create Organization Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">Create Organization</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              {/* Name Field */}
              <FormControl isInvalid={!!nameError}>
                <FormControlLabel>
                  <Text size="sm" fontWeight="$medium" color="$textLight900">
                    Name
                  </Text>
                </FormControlLabel>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="e.g., Acme Corp"
                    value={newOrgName}
                    onChangeText={handleNameChange}
                    editable={!creating}
                    aria-label="Organization name"
                  />
                </Input>
                {nameError && (
                  <FormControlError>
                    <FormControlErrorText>{nameError}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Slug Field */}
              <FormControl isInvalid={!!slugError}>
                <FormControlLabel>
                  <Text size="sm" fontWeight="$medium" color="$textLight900">
                    Slug
                  </Text>
                </FormControlLabel>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="e.g., acme-corp"
                    value={newOrgSlug}
                    onChangeText={handleSlugChange}
                    editable={!creating}
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
            </VStack>
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
              <ButtonText>{creating ? 'Creating...' : 'Create Organization'}</ButtonText>
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
  fab: {
    bottom: 24,
    height: 56,
    position: 'absolute',
    right: 24,
    width: 56,
  },
  orgButton: {
    justifyContent: 'flex-start',
    width: '100%',
  },
});
