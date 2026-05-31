/**
 * MealCard — compact card for meal assignments on the calendar/planner view
 *
 * Displays a recipe thumbnail, title, timing info, and optional
 * badges for difficulty and meal slot. Built on NativeCard for
 * native-feel styling and press feedback.
 */
import { useCallback, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { NativeCard } from '../bna/NativeCard';
import { Badge, BadgeText } from '../gluestack/Badge';
import type { RecipeDifficulty, MealSlot } from '@mealme/shared';
import { getMealSlotLabel } from '@mealme/shared';

// ── Public Props ────────────────────────────────────────────────────────────

export interface MealCardProps {
  /** Recipe title — displayed prominently */
  recipeTitle: string;
  /** Thumbnail image URL */
  recipeImageUrl?: string;
  /** Prep time in minutes, shown as "XX min" with a clock icon */
  prepTime?: number;
  /** Cook time in minutes, shown as "XX min" */
  cookTime?: number;
  /** Number of servings, shown as "Serves X" */
  servings?: number;
  /** Difficulty level — color-coded badge */
  difficulty?: RecipeDifficulty;
  /** Meal slot label with slot-specific color */
  mealSlot?: MealSlot;
  /** Card press handler */
  onPress?: () => void;
  /** Container style override */
  style?: ViewStyle;
}

// ── Color Helpers ───────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<RecipeDifficulty, { bg: string; text: string }> = {
  easy: { bg: '#dcfce7', text: '#166534' },
  medium: { bg: '#fef9c3', text: '#854d0e' },
  hard: { bg: '#fee2e2', text: '#991b1b' },
};

const MEAL_SLOT_COLORS: Record<string, { bg: string; text: string }> = {
  breakfast: { bg: '#fef3c7', text: '#92400e' },
  morningSnack: { bg: '#fce7f3', text: '#9d174d' },
  lunch: { bg: '#dbeafe', text: '#1e40af' },
  afternoonSnack: { bg: '#fce7f3', text: '#9d174d' },
  dinner: { bg: '#ede9fe', text: '#5b21b6' },
  eveningSnack: { bg: '#fce7f3', text: '#9d174d' },
};

// ── Component ───────────────────────────────────────────────────────────────

export function MealCard({
  recipeTitle,
  recipeImageUrl,
  prepTime,
  cookTime,
  servings,
  difficulty,
  mealSlot,
  onPress,
  style,
}: MealCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isInteractive = !!onPress;

  const handlePressIn = useCallback(() => {
    if (isInteractive) {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }).start();
    }
  }, [isInteractive, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (isInteractive) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }).start();
    }
  }, [isInteractive, scaleAnim]);

  const cardContent = (
    <NativeCard
      variant="outlined"
      padding="sm"
      style={[styles.card, style]}
    >
      <View style={styles.row}>
        {/* Thumbnail */}
        {recipeImageUrl ? (
          <Image
            source={{ uri: recipeImageUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailPlaceholderText}>🍽</Text>
          </View>
        )}

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {recipeTitle}
          </Text>

          {/* Time & servings row */}
          <View style={styles.metaRow}>
            {prepTime != null && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱</Text>
                <Text style={styles.metaText}>{prepTime} min</Text>
              </View>
            )}
            {cookTime != null && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🔥</Text>
                <Text style={styles.metaText}>{cookTime} min</Text>
              </View>
            )}
            {servings != null && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👥</Text>
                <Text style={styles.metaText}>Serves {servings}</Text>
              </View>
            )}
          </View>

          {/* Badges row */}
          <View style={styles.badgeRow}>
            {difficulty && (
              <Badge
                size="sm"
                style={{
                  backgroundColor: DIFFICULTY_COLORS[difficulty].bg,
                  borderColor: 'transparent',
                }}
              >
                <BadgeText
                  style={{
                    color: DIFFICULTY_COLORS[difficulty].text,
                    fontSize: 10,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {difficulty}
                </BadgeText>
              </Badge>
            )}
            {mealSlot && (
              <Badge
                size="sm"
                style={{
                  backgroundColor: MEAL_SLOT_COLORS[mealSlot]?.bg ?? '#f3f4f6',
                  borderColor: 'transparent',
                }}
              >
                <BadgeText
                  style={{
                    color: MEAL_SLOT_COLORS[mealSlot]?.text ?? '#374151',
                    fontSize: 10,
                    fontWeight: '600',
                  }}
                >
                  {getMealSlotLabel(mealSlot)}
                </BadgeText>
              </Badge>
            )}
          </View>
        </View>
      </View>
    </NativeCard>
  );

  if (isInteractive) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {cardContent}
        </Animated.View>
      </Pressable>
    );
  }

  return cardContent;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    // NativeCard handles most styling; we just constrain width
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 18,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaIcon: {
    fontSize: 11,
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
});

export default MealCard;
