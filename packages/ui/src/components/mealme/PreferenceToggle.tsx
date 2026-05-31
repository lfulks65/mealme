/**
 * PreferenceToggle — dietary restriction / preference toggle
 *
 * A single row with an icon, label, optional description, and a
 * SynapsisUI Toggle. Category determines the active color theme:
 * dietary=green, cuisine=blue, allergy=red, lifestyle=purple.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Toggle } from '../synapsis/Toggle';

// ── Public Props ────────────────────────────────────────────────────────────

export type PreferenceCategory = 'dietary' | 'cuisine' | 'allergy' | 'lifestyle';

export interface PreferenceToggleProps {
  /** Display name (e.g., "Gluten-Free", "Vegetarian") */
  label: string;
  /** Current on/off state */
  value: boolean;
  /** Callback when toggle value changes */
  onValueChange: (value: boolean) => void;
  /** Optional subtitle explaining the preference */
  description?: string;
  /** Optional emoji or icon character */
  icon?: string;
  /** Determines color theme */
  category?: PreferenceCategory;
  /** Disabled state — reduces opacity */
  disabled?: boolean;
  /** Container style override */
  style?: ViewStyle;
}

// ── Category Colors ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<PreferenceCategory, string> = {
  dietary: '#16a34a', // green
  cuisine: '#2563eb', // blue
  allergy: '#dc2626', // red
  lifestyle: '#9333ea', // purple
};

// ── Component ───────────────────────────────────────────────────────────────

export function PreferenceToggle({
  label,
  value,
  onValueChange,
  description,
  icon,
  category = 'dietary',
  disabled = false,
  style,
}: PreferenceToggleProps) {
  const activeColor = useMemo(() => CATEGORY_COLORS[category], [category]);

  return (
    <View
      style={[styles.container, disabled && styles.disabled, style]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
    >
      {/* Left: icon + text */}
      <View style={styles.leftSection}>
        {icon ? (
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        ) : null}
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      </View>

      {/* Right: toggle */}
      <Toggle
        value={value}
        onValueChange={onValueChange}
        activeColor={activeColor}
        disabled={disabled}
        size="md"
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  description: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 18,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    marginRight: 10,
    width: 32,
  },
  label: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  leftSection: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
});

export default PreferenceToggle;
