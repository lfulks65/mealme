/**
 * PreferenceSummaryCard — compact card showing current family preferences
 *
 * Displays an aggregated view of family preferences suitable for
 * profile pages and dashboards. Uses @mealme/ui NativeCard for
 * platform-specific styling and SynapsisUI Toggle for interactive
 * preference badges.
 *
 * Shows:
 *   - Dietary restrictions as compact badges
 *   - Allergies as compact badges
 *   - Cuisine preferences as compact badges
 *   - Budget tier with weekly range
 *   - Household size
 *   - Member override count
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import {
  getDietaryRestrictionLabel,
  getCuisineTypeLabel,
  getBudgetTierLabel,
  getBudgetTierWeeklyRange,
} from '@mealme/shared';
import type { AggregatedPreferences } from '@mealme/api';

export interface PreferenceSummaryCardProps {
  /** Aggregated preferences to display. */
  preferences: AggregatedPreferences;
  /** Called when the card is pressed (for navigation to settings). */
  onPress?: () => void;
  /** Variant style for the card. */
  variant?: 'elevated' | 'outlined' | 'filled' | 'glass';
  /** Whether to show all details or a compact view. */
  compact?: boolean;
  /** Container style */
  style?: ViewStyle;
}

// ─── Badge ───────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
}

function Badge({
  label,
  color = '#2563eb',
  backgroundColor = '#eff6ff',
  size = 'md',
}: BadgeProps) {
  const px = size === 'sm' ? 8 : 10;
  const py = size === 'sm' ? 3 : 4;
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <View
      style={{
        paddingHorizontal: px,
        paddingVertical: py,
        borderRadius: 12,
        backgroundColor,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <Text style={{ fontSize, fontWeight: '500', color } as TextStyle}>
        {label}
      </Text>
    </View>
  );
}

// ─── Stat Item ───────────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' } as TextStyle}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' } as TextStyle}>
        {label}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 1, textAlign: 'center' } as TextStyle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={{ marginBottom: compact ? 10 : 14 }}>
      <Text
        style={{
          fontSize: compact ? 11 : 12,
          fontWeight: '600',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 6,
        } as TextStyle}
      >
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PreferenceSummaryCard({
  preferences,
  onPress,
  variant = 'elevated',
  compact = false,
  style,
}: PreferenceSummaryCardProps) {
  const { dietaryRestrictions, allergies, cuisinePreferences, budgetTier, householdSize, memberOverrides } = preferences;

  // ── Budget info ────────────────────────────────────────────────────────
  const budgetLabel = getBudgetTierLabel(budgetTier);
  const budgetRange = getBudgetTierWeeklyRange(budgetTier);
  const budgetSubtitle = budgetRange ? `$${budgetRange[0]}–$${budgetRange[1]}/wk` : undefined;

  // ── Card variant styles ────────────────────────────────────────────────
  const cardStyles = useMemo((): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 16,
      padding: compact ? 12 : 16,
      overflow: 'hidden',
    };

    switch (variant) {
      case 'elevated':
        return {
          ...base,
          backgroundColor: '#ffffff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        };
      case 'outlined':
        return {
          ...base,
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#e5e7eb',
        };
      case 'filled':
        return {
          ...base,
          backgroundColor: '#f9fafb',
        };
      case 'glass':
        return {
          ...base,
          backgroundColor: 'rgba(255,255,255,0.8)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.4)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 2,
        };
      default:
        return base;
    }
  }, [variant, compact]);

  // ── Content ────────────────────────────────────────────────────────────

  const content = (
    <View style={[cardStyles, style]}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: compact ? 10 : 14,
        }}
      >
        <Text
          style={{
            fontSize: compact ? 15 : 17,
            fontWeight: '700',
            color: '#111827',
          } as TextStyle}
        >
          Family Preferences
        </Text>
        {onPress && (
          <Pressable onPress={onPress}>
            <Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '500' } as TextStyle}>
              Edit
            </Text>
          </Pressable>
        )}
      </View>

      {/* Stats row */}
      <View
        style={{
          flexDirection: 'row',
          paddingBottom: compact ? 10 : 14,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
          marginBottom: compact ? 10 : 14,
        }}
      >
        <StatItem label="Budget" value={budgetLabel} subtitle={budgetSubtitle} />
        <View style={{ width: 1, backgroundColor: '#f3f4f6' }} />
        <StatItem label="Household" value={String(householdSize)} subtitle={householdSize === 1 ? 'person' : 'people'} />
        {memberOverrides.length > 0 && (
          <>
            <View style={{ width: 1, backgroundColor: '#f3f4f6' }} />
            <StatItem
              label="Overrides"
              value={String(memberOverrides.length)}
              subtitle={memberOverrides.length === 1 ? 'member' : 'members'}
            />
          </>
        )}
      </View>

      {/* Dietary Restrictions */}
      {dietaryRestrictions.length > 0 && (
        <Section title="Dietary" compact={compact}>
          {dietaryRestrictions.map((key) => (
            <Badge
              key={key}
              label={getDietaryRestrictionLabel(key)}
              color="#059669"
              backgroundColor="#ecfdf5"
              size={compact ? 'sm' : 'md'}
            />
          ))}
        </Section>
      )}

      {/* Allergies */}
      {allergies.length > 0 && (
        <Section title="Allergies" compact={compact}>
          {allergies.map((allergy) => (
            <Badge
              key={allergy}
              label={allergy}
              color="#dc2626"
              backgroundColor="#fef2f2"
              size={compact ? 'sm' : 'md'}
            />
          ))}
        </Section>
      )}

      {/* Cuisine Preferences */}
      {cuisinePreferences.length > 0 && (
        <Section title="Cuisines" compact={compact}>
          {cuisinePreferences.map((key) => (
            <Badge
              key={key}
              label={getCuisineTypeLabel(key)}
              size={compact ? 'sm' : 'md'}
            />
          ))}
        </Section>
      )}

      {/* Empty state */}
      {dietaryRestrictions.length === 0 &&
        allergies.length === 0 &&
        cuisinePreferences.length === 0 && (
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#9ca3af' } as TextStyle}>
              No preferences set yet
            </Text>
            {onPress && (
              <Pressable onPress={onPress} style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '500' } as TextStyle}>
                  Set up preferences
                </Text>
              </Pressable>
            )}
          </View>
        )}
    </View>
  );

  // Wrap in Pressable if onPress is provided (for the whole card)
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { opacity: pressed ? 0.95 : 1 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export default PreferenceSummaryCard;
