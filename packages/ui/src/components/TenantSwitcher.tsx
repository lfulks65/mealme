/**
 * TenantSwitcher — shows the current org and family and allows switching.
 *
 * Uses `useOrg()` and `useFamily()` hooks which now sync with the
 * TenantProvider context. This component serves as both a useful UI
 * element and a proof-of-concept that the tenant integration works.
 *
 * Usage:
 * ```tsx
 * import { TenantSwitcher } from '@mealme/ui';
 * <TenantSwitcher />
 * ```
 */

import { Box, Text, VStack, HStack, Spinner } from '@gluestack-ui/themed';
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

export interface TenantSwitcherProps {
  /** Optional container style overrides */
  style?: any;
}

export function TenantSwitcher({ style }: TenantSwitcherProps) {
  const { currentOrg, orgs, switchOrg, loading: orgLoading } = useOrg();
  const { currentFamily, families, switchFamily, loading: familyLoading } = useFamily();
  const { ready: tenantReady } = useTenant();

  // Wait for tenant context to be ready (restored from storage)
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

  return (
    <Box px="$4" py="$3" style={style}>
      <VStack space="md">
        {/* Org selector */}
        <VStack space="xs">
          <Text size="xs" fontWeight="$medium" color="$textLight500">
            Organization
          </Text>
          {orgLoading && orgs.length === 0 ? (
            <HStack space="sm" alignItems="center">
              <Spinner size="small" color="$primary500" />
              <Text size="sm" color="$textLight500">
                Loading orgs...
              </Text>
            </HStack>
          ) : (
            <Select
              selectedValue={currentOrg?.id ?? ''}
              onValueChange={(value: string) => {
                if (value) switchOrg(value);
              }}
            >
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
                </SelectContent>
              </SelectPortal>
            </Select>
          )}
        </VStack>

        {/* Family selector */}
        <VStack space="xs">
          <Text size="xs" fontWeight="$medium" color="$textLight500">
            Family
          </Text>
          {!currentOrg ? (
            <Text size="sm" color="$textLight400" fontStyle="italic">
              Select an organization first
            </Text>
          ) : familyLoading && families.length === 0 ? (
            <HStack space="sm" alignItems="center">
              <Spinner size="small" color="$primary500" />
              <Text size="sm" color="$textLight500">
                Loading families...
              </Text>
            </HStack>
          ) : families.length === 0 ? (
            <Text size="sm" color="$textLight400" fontStyle="italic">
              No families in this organization
            </Text>
          ) : (
            <Select
              selectedValue={currentFamily?.id ?? ''}
              onValueChange={(value: string) => {
                if (value) switchFamily(value);
              }}
            >
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
                </SelectContent>
              </SelectPortal>
            </Select>
          )}
        </VStack>
      </VStack>
    </Box>
  );
}
