/**
 * RecipeCard — rich card for recipe browsing/discovery
 *
 * Uses gluestack Card with ProductCard-style press animation.
 * Supports full and compact variants. Shows dietary compliance
 * badges, cuisine type, and recipe metadata.
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
import { Card } from '../gluestack/Card';
import { Badge, BadgeText } from '../gluestack/Badge';
import type { RecipeFull, RecipeDifficulty, RecipeTag, RecipeDietaryInfo } from '@mealme/shared';

// ── Public Props ────────────────────────────────────────────────────────────

export interface RecipeCardProps {
  /** Full recipe data */
  recipe: RecipeFull;
  /** Press handler — receives recipe ID */
  onPress?: (recipeId: string) => void;
  /** Show dietary compliance badges (default: true) */
  showDietaryBadges?: boolean;
  /** Show cuisine type badge (default: true) */
  showCuisine?: boolean;
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Container style override */
  style?: ViewStyle;
}

// ── Color Helpers ───────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<RecipeDifficulty, { bg: string; text: string }> = {
  easy: { bg: '#dcfce7', text: '#166534' },
  medium: { bg: '#fef9c3', text: '#854d0e' },
  hard: { bg: '#fee2e2', text: '#991b1b' },
};

/** Derive difficulty from recipe data (tags or default). */
function getDifficulty(recipe: RecipeFull): RecipeDifficulty | null {
  const diffTag = recipe.tags?.find((t: RecipeTag) =>
    ['easy', 'medium', 'hard'].includes(t.tag),
  );
  if (diffTag) return diffTag.tag as RecipeDifficulty;
  return null;
}

/** Get compliant dietary info entries. */
function getCompliantDietary(recipe: RecipeFull): string[] {
  if (!recipe.dietary_info) return [];
  return recipe.dietary_info
    .filter((d: RecipeDietaryInfo) => d.is_compliant)
    .map((d: RecipeDietaryInfo) => d.restriction);
}

// ── Component ───────────────────────────────────────────────────────────────

export function RecipeCard({
  recipe,
  onPress,
  showDietaryBadges = true,
  showCuisine = true,
  variant = 'full',
  style,
}: RecipeCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isInteractive = !!onPress;

  const handlePressIn = useCallback(() => {
    if (isInteractive) {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
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

  const handlePress = useCallback(() => {
    onPress?.(recipe.id);
  }, [onPress, recipe.id]);

  const imageUrl = recipe.image_url;
  const difficulty = getDifficulty(recipe);
  const compliantDietary = getCompliantDietary(recipe);

  // ── Compact variant ────────────────────────────────────────────────────
  if (variant === 'compact') {
    const compactContent = (
      <Card style={[styles.compactCard, style]}>
        <View style={styles.compactImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.compactImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.compactImage, styles.imagePlaceholder]}>
              <Text style={styles.placeholderIcon}>🍽</Text>
            </View>
          )}
          <View style={styles.compactOverlay}>
            <Text style={styles.compactTitle} numberOfLines={2}>
              {recipe.title}
            </Text>
          </View>
        </View>
      </Card>
    );

    if (isInteractive) {
      return (
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {compactContent}
          </Animated.View>
        </Pressable>
      );
    }

    return compactContent;
  }

  // ── Full variant ───────────────────────────────────────────────────────
  const fullContent = (
    <Card style={[styles.fullCard, style]}>
      {/* Hero image */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.heroImage, styles.imagePlaceholder]}>
          <Text style={[styles.placeholderIcon, { fontSize: 36 }]}>🍽</Text>
        </View>
      )}

      {/* Content area */}
      <View style={styles.contentArea}>
        <Text style={styles.fullTitle} numberOfLines={2}>
          {recipe.title}
        </Text>

        {recipe.description && (
          <Text style={styles.description} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}

        {/* Metadata row */}
        <View style={styles.metaRow}>
          {recipe.prep_minutes != null && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⏱</Text>
              <Text style={styles.metaText}>{recipe.prep_minutes} min</Text>
            </View>
          )}
          {recipe.servings != null && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>👥</Text>
              <Text style={styles.metaText}>Serves {recipe.servings}</Text>
            </View>
          )}
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
        </View>

        {/* Dietary compliance badges */}
        {showDietaryBadges && compliantDietary.length > 0 && (
          <View style={styles.badgeRow}>
            {compliantDietary.slice(0, 4).map((restriction) => (
              <Badge
                key={restriction}
                size="sm"
                style={styles.dietaryBadge}
              >
                <BadgeText style={styles.dietaryBadgeText}>
                  {restriction}
                </BadgeText>
              </Badge>
            ))}
            {compliantDietary.length > 4 && (
              <Badge size="sm" style={styles.dietaryBadge}>
                <BadgeText style={styles.dietaryBadgeText}>
                  +{compliantDietary.length - 4}
                </BadgeText>
              </Badge>
            )}
          </View>
        )}

        {/* Cuisine badge */}
        {showCuisine && recipe.cuisine && (
          <View style={styles.badgeRow}>
            <Badge size="sm" style={styles.cuisineBadge}>
              <BadgeText style={styles.cuisineBadgeText}>
                {recipe.cuisine}
              </BadgeText>
            </Badge>
          </View>
        )}
      </View>
    </Card>
  );

  if (isInteractive) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {fullContent}
        </Animated.View>
      </Pressable>
    );
  }

  return fullContent;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Full variant
  fullCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  heroImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  contentArea: {
    padding: 12,
  },
  fullTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  dietaryBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: 'transparent',
  },
  dietaryBadgeText: {
    color: '#065f46',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  cuisineBadge: {
    backgroundColor: '#eff6ff',
    borderColor: 'transparent',
  },
  cuisineBadgeText: {
    color: '#1e40af',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Compact variant
  compactCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  compactImageContainer: {
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
  },
  compactOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 17,
  },
});

export default RecipeCard;
