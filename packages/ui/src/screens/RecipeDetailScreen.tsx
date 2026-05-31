import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRecipeDetail } from '../hooks/useRecipeApi';

// ── Dietary Badge ─────────────────────────────────────────────────────────────

interface DietaryBadgeProps {
  restriction: string;
  compliant: boolean;
}

const DietaryBadge: React.FC<DietaryBadgeProps> = ({ restriction, compliant }) => (
  <View style={[styles.dietaryBadge, compliant ? styles.badgeCompliant : styles.badgeNonCompliant]}>
    <Text
      style={[
        styles.dietaryBadgeText,
        compliant ? styles.badgeCompliantText : styles.badgeNonCompliantText,
      ]}
    >
      {compliant ? '✓' : '✗'} {restriction}
    </Text>
  </View>
);

// ── Timer Component ────────────────────────────────────────────────────────────

interface StepTimerProps {
  minutes: number;
}

const StepTimer: React.FC<StepTimerProps> = ({ minutes }) => {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, secondsLeft]);

  const toggle = useCallback(() => {
    if (secondsLeft === 0) {
      setSecondsLeft(minutes * 60);
      setRunning(true);
    } else {
      setRunning((prev) => !prev);
    }
  }, [secondsLeft, minutes]);

  const displayMin = Math.floor(secondsLeft / 60);
  const displaySec = secondsLeft % 60;
  const timeDisplay = `${String(displayMin).padStart(2, '0')}:${String(displaySec).padStart(2, '0')}`;

  return (
    <Pressable
      style={[
        styles.timerButton,
        running && styles.timerButtonRunning,
        secondsLeft === 0 && styles.timerButtonDone,
      ]}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={`Timer: ${timeDisplay}. ${running ? 'Running' : 'Paused'}`}
    >
      <Text style={styles.timerIcon}>{running ? '⏱️' : secondsLeft === 0 ? '✅' : '▶️'}</Text>
      <Text style={styles.timerDisplay}>{timeDisplay}</Text>
    </Pressable>
  );
};

// ── Metadata Pill ─────────────────────────────────────────────────────────────

interface MetadataPillProps {
  icon: string;
  label: string;
  value: string;
}

const MetadataPill: React.FC<MetadataPillProps> = ({ icon, label, value }) => (
  <View style={styles.metadataPill}>
    <Text style={styles.metadataIcon}>{icon}</Text>
    <View>
      <Text style={styles.metadataValue}>{value}</Text>
      <Text style={styles.metadataLabel}>{label}</Text>
    </View>
  </View>
);

// ── RecipeDetailScreen ────────────────────────────────────────────────────────

export interface RecipeDetailScreenProps {
  /** Recipe ID to display */
  recipeId: string;
  /** Navigate back */
  onBack?: () => void;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ recipeId, onBack }) => {
  const { recipe, loading, error } = useRecipeDetail(recipeId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading recipe...</Text>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error ?? 'Recipe not found'}</Text>
        {onBack ? (
          <Pressable onPress={onBack}>
            <Text style={styles.backLink}>Go back</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Back Button Overlay */}
      {onBack ? (
        <Pressable style={styles.backOverlay} onPress={onBack} hitSlop={8}>
          <Text style={styles.backOverlayText}>← Back</Text>
        </Pressable>
      ) : null}

      {/* Hero Image */}
      <View style={styles.heroContainer}>
        {recipe.image_url ? (
          <Image source={{ uri: recipe.image_url }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderIcon}>🍽️</Text>
          </View>
        )}
        <View style={styles.heroGradient} />
      </View>

      {/* Title & Description */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{recipe.title}</Text>
        {recipe.description ? <Text style={styles.description}>{recipe.description}</Text> : null}
      </View>

      {/* Dietary Badges */}
      {recipe.dietary_info.length > 0 ? (
        <View style={styles.badgesRow}>
          {recipe.dietary_info.map((di) => (
            <DietaryBadge key={di.id} restriction={di.restriction} compliant={di.is_compliant} />
          ))}
        </View>
      ) : null}

      {/* Metadata Row */}
      <View style={styles.metadataRow}>
        <MetadataPill icon="⏱️" label="Total Time" value={`${totalTime} min`} />
        <MetadataPill icon="👥" label="Servings" value={`${recipe.servings ?? '—'}`} />
        <MetadataPill icon="🔥" label="Calories" value={`${recipe.calories ?? '—'} cal`} />
      </View>

      {/* Cuisine & Tags */}
      {recipe.cuisine || recipe.tags.length > 0 ? (
        <View style={styles.tagsSection}>
          {recipe.cuisine ? (
            <View style={styles.cuisineTag}>
              <Text style={styles.cuisineTagText}>{recipe.cuisine}</Text>
            </View>
          ) : null}
          {recipe.tags.map((tag) => (
            <View key={tag.id} style={styles.tag}>
              <Text style={styles.tagText}>#{tag.tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Ingredients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🥗 Ingredients</Text>
        <View style={styles.sectionDivider} />
        {recipe.ingredients.map((ing) => (
          <View key={ing.id} style={styles.ingredientRow}>
            <View style={styles.ingredientBullet}>
              <Text style={styles.ingredientBulletText}>•</Text>
            </View>
            <View style={styles.ingredientContent}>
              <Text style={styles.ingredientName}>
                {ing.quantity} {ing.unit} {ing.name}
                {ing.optional ? ' (optional)' : ''}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍🍳 Instructions</Text>
        <View style={styles.sectionDivider} />
        {recipe.steps.map((step) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>{step.step_number}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepInstruction}>{step.instruction}</Text>
              {step.timer_minutes !== null ? <StepTimer minutes={step.timer_minutes} /> : null}
            </View>
          </View>
        ))}
      </View>

      {/* Bottom Spacer */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  backLink: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  backOverlay: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
    top: 12,
    zIndex: 10,
  },
  backOverlayText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  badgeCompliant: {
    backgroundColor: '#E8F5E9',
  },
  badgeCompliantText: {
    color: '#2E7D32',
  },
  badgeNonCompliant: {
    backgroundColor: '#FFEBEE',
  },
  badgeNonCompliantText: {
    color: '#C62828',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  bottomSpacer: {
    height: 40,
  },
  container: {
    backgroundColor: '#FAFAFA',
    flex: 1,
  },
  cuisineTag: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cuisineTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    color: '#666666',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  dietaryBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dietaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 14,
    marginBottom: 8,
  },
  heroContainer: {
    height: 260,
    position: 'relative',
  },
  heroGradient: {
    backgroundColor: 'rgba(250,250,250,0.8)',
    bottom: 0,
    height: 80,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  heroPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  heroPlaceholderIcon: {
    fontSize: 64,
  },
  ingredientBullet: {
    alignItems: 'center',
    width: 20,
  },
  ingredientBulletText: {
    color: '#FF6B35',
    fontSize: 16,
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientName: {
    color: '#333333',
    fontSize: 15,
    lineHeight: 22,
  },
  ingredientRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
  },
  metadataIcon: {
    fontSize: 20,
  },
  metadataLabel: {
    color: '#999999',
    fontSize: 11,
  },
  metadataPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    flex: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  metadataValue: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionDivider: {
    backgroundColor: '#FF6B35',
    borderRadius: 1,
    height: 2,
    marginBottom: 12,
    marginTop: 4,
    width: 40,
  },
  sectionTitle: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    color: '#333333',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepNumberContainer: {
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: 12,
    width: 32,
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 10,
  },
  tag: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: '#666666',
    fontSize: 12,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  timerButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerButtonDone: {
    backgroundColor: '#E8F5E9',
  },
  timerButtonRunning: {
    backgroundColor: '#FFE0B2',
  },
  timerDisplay: {
    color: '#E65100',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  timerIcon: {
    fontSize: 16,
  },
  title: {
    color: '#1A1A1A',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
