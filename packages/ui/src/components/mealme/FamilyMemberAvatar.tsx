/**
 * FamilyMemberAvatar — avatar for a family member
 *
 * Wraps gluestack Avatar with role-based border color, initials
 * fallback, and an optional role badge dot at the bottom-right.
 * Pressable wrapper when onPress is provided.
 */
import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import type { FamilyRole } from '@mealme/shared';
import { Avatar, AvatarImage, AvatarFallbackText, AvatarBadge } from '../gluestack/Avatar';

// ── Public Props ────────────────────────────────────────────────────────────

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface FamilyMemberAvatarProps {
  /** Member name (used for fallback initials) */
  name: string;
  /** Photo URL */
  avatarUrl?: string;
  /** Determines border color */
  role?: FamilyRole;
  /** Size variant — defaults to 'md' */
  size?: AvatarSize;
  /** Show role badge dot — defaults to true */
  showBadge?: boolean;
  /** Press handler — wraps in Pressable if provided */
  onPress?: () => void;
  /** Container style override */
  style?: ViewStyle;
}

// ── Size Map ────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

// ── Role Colors ─────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<FamilyRole, string> = {
  parent: '#2563eb',   // blue
  child: '#16a34a',    // green
  guardian: '#ea580c', // orange
  member: '#6b7280',   // gray
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate initials from a name (first letter of first + last name).
 * If only one word, returns the first letter.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

// ── Component ───────────────────────────────────────────────────────────────

export function FamilyMemberAvatar({
  name,
  avatarUrl,
  role = 'member',
  size = 'md',
  showBadge = true,
  onPress,
  style,
}: FamilyMemberAvatarProps) {
  const avatarSize = SIZE_MAP[size];
  const borderColor = ROLE_COLORS[role];
  const initials = useMemo(() => getInitials(name), [name]);

  const avatarContent = (
    <View style={[styles.container, style]}>
      <Avatar
        size={size}
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderColor,
          },
        ]}
      >
        {avatarUrl ? (
          <AvatarImage
            source={{ uri: avatarUrl }}
            style={styles.avatarImage}
            alt={`${name}'s avatar`}
          />
        ) : (
          <AvatarFallbackText
            style={[styles.fallbackText, { fontSize: avatarSize * 0.36 }]}
          >
            {initials}
          </AvatarFallbackText>
        )}
        {showBadge && (
          <AvatarBadge
            style={[
              styles.badge,
              {
                backgroundColor: borderColor,
                width: size === 'sm' ? 8 : 12,
                height: size === 'sm' ? 8 : 12,
                borderRadius: size === 'sm' ? 4 : 6,
              },
            ]}
          />
        )}
      </Avatar>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {avatarContent}
      </Pressable>
    );
  }

  return avatarContent;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    // No extra styling — just wraps for pressability
  },
  avatar: {
    borderWidth: 2,
    borderRadius: 999,
  },
  avatarImage: {
    borderRadius: 999,
  },
  fallbackText: {
    fontWeight: '600',
    color: '#374151',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});

export default FamilyMemberAvatar;
