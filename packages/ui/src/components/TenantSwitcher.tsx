/**
 * TenantSwitcher — polished org/family switcher with create shortcuts and
 * better UX.
 *
 * Features:
 * - Compact header showing current org/family selection
 * - "Create New..." shortcuts in both Select dropdowns
 * - Empty states with create prompts
 * - Letter-based avatars for orgs and families
 * - `compact` prop for horizontal layout in headers/navbars
 *
 * Usage:
 * ```tsx
 * import { TenantSwitcher } from '@mealme/ui';
 *
 * // Sidebar (vertical, default)
 * <TenantSwitcher
 *   onCreateOrgPress={() => navigation.navigate('CreateOrg')}
 *   onCreateFamilyPress={() => navigation.navigate('CreateFamily')}
 * />
 *
 * // Header (horizontal, compact)
 * <TenantSwitcher
 *   compact
 *   onCreateOrgPress={() => navigation.navigate('CreateOrg')}
 *   onCreateFamilyPress={() => navigation.navigate('CreateFamily')}
 * />
 * ```
 */

import { useState, useCallback } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Spinner,
  Pressable,
  Icon,
  AddIcon,
  ChevronDownIcon,
} from '@gluestack-ui/themed';
import { useOrg } from '@mealme/api';
import { useFamily } from '@mealme/api';
import { useTenant } from '@mealme/api';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
} from './gluestack/Select';
import { Avatar, AvatarFallbackText } from './gluestack/Avatar';
import { Button, ButtonText, ButtonIcon } from './gluestack/Button';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TenantSwitcherProps {
  /** Optional container style overrides */
  style?: any;
  /** Horizontal layout for headers/navbars */
  compact?: boolean;
  /** Called when user taps "Create Organization" */
  onCreateOrgPress?: () => void;
  /** Called when user taps "Create Family" */
  onCreateFamilyPress?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sentinel value for the "Create New" SelectItem — never a real ID. */
const CREATE_ORG_VALUE = '__create_org__';
const CREATE_FAMILY_VALUE = '__create_family__';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Small circular avatar showing the first letter of a name. */
function LetterAvatar({ name, size = 'sm' }: { name: string; size?: 'xs' | 'sm' | 'md' }) {
  return (
    <Avatar size={size} bgColor="$primary600">
      <AvatarFallbackText>{name}</AvatarFallbackText>
    </Avatar>
  );
}

/** Compact header showing current org > family breadcrumb. */
function SelectionHeader({
  orgName,
  familyName,
  onToggle,
}: {
  orgName: string | undefined;
  familyName: string | undefined;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle}>
      <HStack
        space="sm"
        alignItems="center"
        px="$3"
        py="$2"
        bg="$backgroundLight100"
        borderRadius="$lg"
        borderWidth={1}
        borderColor="$borderLight200"
      >
        {/* Org avatar + name */}
        <LetterAvatar name={orgName ?? '?'} size="xs" />
        <Text size="sm" fontWeight="$medium" color="$textLight900" numberOfLines={1}>
          {orgName ?? 'No org'}
        </Text>

        {/* Separator chevron */}
        <Text size="sm" color="$textLight400">
          ›
        </Text>

        {/* Family avatar + name */}
        <LetterAvatar name={familyName ?? '?'} size="xs" />
        <Text size="sm" fontWeight="$medium" color="$textLight900" numberOfLines={1}>
          {familyName ?? 'No family'}
        </Text>

        {/* Dropdown indicator */}
        <Icon as={ChevronDownIcon} size="xs" color="$textLight400" ml="auto" />
      </HStack>
    </Pressable>
  );
}

/** Empty-state prompt with a create button. */
function EmptyCreatePrompt({
  message,
  buttonLabel,
  onPress,
}: {
  message: string;
  buttonLabel: string;
  onPress?: () => void;
}) {
  return (
    <VStack space="sm" py="$2">
      <Text size="sm" color="$textLight400" fontStyle="italic">
        {message}
      </Text>
      {onPress && (
        <Button size="sm" variant="outline" onPress={onPress} alignSelf="flex-start">
          <ButtonIcon as={AddIcon} size="xs" />
          <ButtonText>{buttonLabel}</ButtonText>
        </Button>
      )}
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TenantSwitcher({
  style,
  compact = false,
  onCreateOrgPress,
  onCreateFamilyPress,
}: TenantSwitcherProps) {
  const { currentOrg, orgs, switchOrg, loading: orgLoading } = useOrg();
  const { currentFamily, families, switchFamily, loading: familyLoading } = useFamily();
  const { ready: tenantReady } = useTenant();

  // Track whether the dropdowns are expanded (for compact mode toggle)
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  // ── Handlers (declared before any early returns to satisfy rules-of-hooks) ─

  const handleOrgValueChange = useCallback(
    (value: string) => {
      if (value === CREATE_ORG_VALUE) {
        onCreateOrgPress?.();
        return;
      }
      if (value) switchOrg(value);
    },
    [switchOrg, onCreateOrgPress],
  );

  const handleFamilyValueChange = useCallback(
    (value: string) => {
      if (value === CREATE_FAMILY_VALUE) {
        onCreateFamilyPress?.();
        return;
      }
      if (value) switchFamily(value);
    },
    [switchFamily, onCreateFamilyPress],
  );

  // ── Loading state ──────────────────────────────────────────────────────
  if (!tenantReady) {
    return (
      <Box px="$4" py="$3" style={style}>
        <HStack space="sm" alignItems="center">
          <Spinner size="small" color="$primary500" />
          <Text size="sm" color="$textLight500">
            Loading tenant...
          </Text>
        </HStack>
      </Box>
    );
  }

  // ── Org selector ───────────────────────────────────────────────────────

  const renderOrgSelector = () => {
    // Loading state
    if (orgLoading && orgs.length === 0) {
      return (
        <HStack space="sm" alignItems="center">
          <Spinner size="small" color="$primary500" />
          <Text size="sm" color="$textLight500">
            Loading orgs...
          </Text>
        </HStack>
      );
    }

    // Empty state
    if (orgs.length === 0) {
      return (
        <EmptyCreatePrompt
          message="No organizations yet"
          buttonLabel="Create one"
          onPress={onCreateOrgPress}
        />
      );
    }

    // Select dropdown
    return (
      <Select selectedValue={currentOrg?.id ?? ''} onValueChange={handleOrgValueChange}>
        <SelectTrigger variant="outline" size="md">
          <SelectInput placeholder="Select organization" />
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent>
            <SelectDragIndicatorWrapper>
              <SelectDragIndicator />
            </SelectDragIndicatorWrapper>
            {orgs.map((org: { id: string; name: string }) => (
              <SelectItem key={org.id} label={org.name} value={org.id} />
            ))}
            {onCreateOrgPress && (
              <SelectItem label="➕ Create Organization" value={CREATE_ORG_VALUE} />
            )}
          </SelectContent>
        </SelectPortal>
      </Select>
    );
  };

  // ── Family selector ────────────────────────────────────────────────────

  const renderFamilySelector = () => {
    // No org selected — disable
    if (!currentOrg) {
      return (
        <Text size="sm" color="$textLight400" fontStyle="italic">
          Select an organization first
        </Text>
      );
    }

    // Loading state
    if (familyLoading && families.length === 0) {
      return (
        <HStack space="sm" alignItems="center">
          <Spinner size="small" color="$primary500" />
          <Text size="sm" color="$textLight500">
            Loading families...
          </Text>
        </HStack>
      );
    }

    // Empty state
    if (families.length === 0) {
      return (
        <EmptyCreatePrompt
          message="No families in this organization"
          buttonLabel="Create one"
          onPress={onCreateFamilyPress}
        />
      );
    }

    // Select dropdown
    return (
      <Select selectedValue={currentFamily?.id ?? ''} onValueChange={handleFamilyValueChange}>
        <SelectTrigger variant="outline" size="md">
          <SelectInput placeholder="Select family" />
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent>
            <SelectDragIndicatorWrapper>
              <SelectDragIndicator />
            </SelectDragIndicatorWrapper>
            {families.map((family: { id: string; name: string }) => (
              <SelectItem key={family.id} label={family.name} value={family.id} />
            ))}
            {onCreateFamilyPress && (
              <SelectItem label="➕ Create Family" value={CREATE_FAMILY_VALUE} />
            )}
          </SelectContent>
        </SelectPortal>
      </Select>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────

  // Compact mode: horizontal layout with collapsible dropdowns
  if (compact) {
    return (
      <Box style={style}>
        <VStack space="xs">
          {/* Compact header / trigger */}
          <SelectionHeader
            orgName={currentOrg?.name}
            familyName={currentFamily?.name}
            onToggle={toggleExpanded}
          />

          {/* Expandable dropdowns */}
          {expanded && (
            <VStack space="sm" px="$1" py="$2">
              <VStack space="xs">
                <Text size="xs" fontWeight="$medium" color="$textLight500">
                  Organization
                </Text>
                {renderOrgSelector()}
              </VStack>
              <VStack space="xs">
                <Text size="xs" fontWeight="$medium" color="$textLight500">
                  Family
                </Text>
                {renderFamilySelector()}
              </VStack>
            </VStack>
          )}
        </VStack>
      </Box>
    );
  }

  // Default: vertical sidebar layout
  return (
    <Box px="$4" py="$3" style={style}>
      <VStack space="md">
        {/* Current selection header */}
        <SelectionHeader
          orgName={currentOrg?.name}
          familyName={currentFamily?.name}
          onToggle={toggleExpanded}
        />

        {/* Org selector */}
        <VStack space="xs">
          <Text size="xs" fontWeight="$medium" color="$textLight500">
            Organization
          </Text>
          {renderOrgSelector()}
        </VStack>

        {/* Family selector */}
        <VStack space="xs">
          <Text size="xs" fontWeight="$medium" color="$textLight500">
            Family
          </Text>
          {renderFamilySelector()}
        </VStack>
      </VStack>
    </Box>
  );
}
