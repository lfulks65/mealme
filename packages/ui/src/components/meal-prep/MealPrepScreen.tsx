/**
 * MealPrepScreen — step-by-step cooking view for a recipe.
 *
 * Features:
 *   - Progress bar at top showing step completion
 *   - Current step highlighted with instruction text
 *   - Timer button for steps with durations
 *   - Ingredient sidebar (collapsible)
 *   - "Next Step" / "Previous Step" navigation
 *   - Step overview (dots or list)
 *   - Smooth transitions between steps
 *   - Full-screen timer overlay (MealPrepTimerView)
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { HapticButton } from '../bna/HapticButton';
import { NativeCard } from '../bna/NativeCard';
import { MealPrepTimerView } from './MealPrepTimerView';
import { useMealPrep, type TimerState } from './useMealPrep';
import type { Recipe, RecipeIngredient, RecipeStep } from '@mealme/shared';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MealPrepScreenProps {
  /** Recipe ID to prepare */
  recipeId: string;
  /** Optional pre-loaded recipe (avoids fetch) */
  recipe?: Recipe | null;
  /** Called when user wants to go back */
  onBack?: () => void;
  /** Called when all steps are completed */
  onComplete?: () => void;
  /** Container style */
  style?: ViewStyle;
}

// ─── Progress Bar ───────────────────────────────────────────────────────────

interface StepProgressBarProps {
  currentStep: number; // 0-based
  totalSteps: number;
  progressPercent: number;
}

function StepProgressBar({ currentStep, totalSteps, progressPercent }: StepProgressBarProps) {
  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.barBg}>
        <Animated.View style={[progressStyles.barFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={progressStyles.label}>
        Step {currentStep + 1} of {totalSteps}
      </Text>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  barBg: {
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    flex: 1,
    height: 6,
    marginRight: 10,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#2563eb',
    borderRadius: 3,
    height: '100%',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  } as TextStyle,
});

// ─── Step Dot Navigator ─────────────────────────────────────────────────────

interface StepDotsProps {
  totalSteps: number;
  currentStep: number;
  onStepPress: (index: number) => void;
}

function StepDots({ totalSteps, currentStep, onStepPress }: StepDotsProps) {
  return (
    <View style={dotsStyles.container}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <Pressable
          key={i}
          onPress={() => onStepPress(i)}
          style={[
            dotsStyles.dot,
            i === currentStep && dotsStyles.dotActive,
            i < currentStep && dotsStyles.dotCompleted,
          ]}
        >
          {i < currentStep ? (
            <Text style={dotsStyles.dotCheck}>✓</Text>
          ) : (
            <Text style={[dotsStyles.dotNumber, i === currentStep && dotsStyles.dotNumberActive]}>
              {i + 1}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const dotsStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  dot: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  dotActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  dotCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  } as TextStyle,
  dotCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  dotNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  } as TextStyle,
  dotNumberActive: {
    color: '#2563eb',
  } as TextStyle,
});

// ─── Ingredient Sidebar ─────────────────────────────────────────────────────

interface IngredientSidebarProps {
  ingredients: RecipeIngredient[];
  visible: boolean;
  onToggle: () => void;
}

function IngredientSidebar({ ingredients, visible, onToggle }: IngredientSidebarProps) {
  return (
    <View style={sidebarStyles.container}>
      <Pressable onPress={onToggle} style={sidebarStyles.header}>
        <Text style={sidebarStyles.headerTitle}>🥘 Ingredients ({ingredients.length})</Text>
        <Text style={sidebarStyles.toggleIcon}>{visible ? '▲' : '▼'}</Text>
      </Pressable>
      {visible && (
        <View style={sidebarStyles.list}>
          {ingredients.map((ing) => (
            <View key={ing.id} style={sidebarStyles.ingredientRow}>
              <Text style={sidebarStyles.ingredientQty}>
                {ing.quantity} {ing.unit}
              </Text>
              <Text style={sidebarStyles.ingredientName}>{ing.name}</Text>
              {ing.preparation && (
                <Text style={sidebarStyles.ingredientPrep}>, {ing.preparation}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const sidebarStyles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  } as TextStyle,
  ingredientName: {
    fontSize: 13,
    color: '#374151',
  } as TextStyle,
  ingredientPrep: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  } as TextStyle,
  ingredientQty: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563eb',
    marginRight: 6,
  } as TextStyle,
  ingredientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 4,
  },
  list: {
    borderTopColor: '#f3f4f6',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  toggleIcon: {
    fontSize: 12,
    color: '#9ca3af',
  } as TextStyle,
});

// ─── Step Card ──────────────────────────────────────────────────────────────

interface StepCardProps {
  step: RecipeStep;
  stepIndex: number;
  hasTimer: boolean;
  timer: TimerState;
  onStartTimer: () => void;
  onShowTimerOverlay: () => void;
}

function StepCard({
  step,
  stepIndex,
  hasTimer,
  timer,
  onStartTimer,
  onShowTimerOverlay,
}: StepCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [stepIndex, fadeAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <NativeCard variant="elevated" padding="lg" style={stepStyles.card}>
        {/* Step badge */}
        <View style={stepStyles.badgeRow}>
          <View style={stepStyles.stepBadge}>
            <Text style={stepStyles.stepBadgeText}>Step {step.step}</Text>
          </View>
          {hasTimer && (
            <View style={stepStyles.timerBadge}>
              <Text style={stepStyles.timerBadgeText}>⏱ {step.durationMinutes} min</Text>
            </View>
          )}
        </View>

        {/* Instruction */}
        <Text style={stepStyles.instruction}>{step.instruction}</Text>

        {/* Timer controls */}
        {hasTimer && (
          <View style={stepStyles.timerControls}>
            {!timer.isRunning && timer.remainingSeconds === 0 && !timer.isComplete && (
              <HapticButton
                title="▶ Start Timer"
                onPress={onStartTimer}
                size="md"
                variant="primary"
              />
            )}
            {timer.isRunning && (
              <Pressable onPress={onShowTimerOverlay} style={stepStyles.timerRunningBtn}>
                <Text style={stepStyles.timerRunningText}>
                  ⏱ {formatTimerDisplay(timer.remainingSeconds)} — Tap to expand
                </Text>
              </Pressable>
            )}
            {!timer.isRunning && timer.remainingSeconds > 0 && !timer.isComplete && (
              <Pressable onPress={onShowTimerOverlay} style={stepStyles.timerPausedBtn}>
                <Text style={stepStyles.timerPausedText}>
                  ⏸ {formatTimerDisplay(timer.remainingSeconds)} — Paused
                </Text>
              </Pressable>
            )}
            {timer.isComplete && (
              <View style={stepStyles.timerCompleteBadge}>
                <Text style={stepStyles.timerCompleteText}>✓ Timer Complete!</Text>
              </View>
            )}
          </View>
        )}
      </NativeCard>
    </Animated.View>
  );
}

function formatTimerDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const stepStyles = StyleSheet.create({
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  instruction: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 26,
  } as TextStyle,
  stepBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  } as TextStyle,
  timerBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#92400e',
  } as TextStyle,
  timerCompleteBadge: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timerCompleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
    textAlign: 'center',
  } as TextStyle,
  timerControls: {
    marginTop: 16,
  },
  timerPausedBtn: {
    backgroundColor: '#fef9c3',
    borderColor: '#fde68a',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timerPausedText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#92400e',
    textAlign: 'center',
  } as TextStyle,
  timerRunningBtn: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timerRunningText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2563eb',
    textAlign: 'center',
  } as TextStyle,
});

// ─── Navigation Bar ─────────────────────────────────────────────────────────

interface NavigationBarProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onComplete?: () => void;
  isLastStep: boolean;
}

function NavigationBar({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onComplete,
  isLastStep,
}: NavigationBarProps) {
  return (
    <View style={navStyles.container}>
      <HapticButton
        title="← Previous"
        onPress={onPrev}
        variant="outline"
        size="md"
        disabled={!hasPrev}
        style={navStyles.button}
      />
      {isLastStep ? (
        <HapticButton
          title="Complete ✓"
          onPress={onComplete ?? onNext}
          variant="primary"
          size="md"
          style={navStyles.button}
        />
      ) : (
        <HapticButton
          title="Next Step →"
          onPress={onNext}
          variant="primary"
          size="md"
          disabled={!hasNext}
          style={navStyles.button}
        />
      )}
    </View>
  );
}

const navStyles = StyleSheet.create({
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopColor: '#e5e7eb',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

// ─── Main Screen ────────────────────────────────────────────────────────────

export function MealPrepScreen({
  recipeId,
  recipe: initialRecipe,
  onBack,
  onComplete,
  style,
}: MealPrepScreenProps) {
  const {
    recipe,
    loading,
    error,
    currentStepIndex,
    currentStep,
    totalSteps,
    progressPercent,
    currentStepHasTimer,
    nextStep,
    prevStep,
    goToStep,
    hasNextStep,
    hasPrevStep,
    timer,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    isTimerOverlayVisible,
    showTimerOverlay,
    hideTimerOverlay,
    refresh,
  } = useMealPrep(recipeId, initialRecipe);

  const [ingredientsVisible, setIngredientsVisible] = useState(false);

  const handleNextStep = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    nextStep();
  }, [nextStep]);

  const handlePrevStep = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    prevStep();
  }, [prevStep]);

  const handleGoToStep = useCallback(
    (index: number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      goToStep(index);
    },
    [goToStep],
  );

  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Text style={styles.loadingText}>Loading recipe…</Text>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Text style={styles.errorText}>{error ?? 'Recipe not found'}</Text>
        <HapticButton title="Retry" onPress={refresh} variant="outline" size="sm" />
      </View>
    );
  }

  const ingredients = recipe.ingredients;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        )}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recipe.title}
        </Text>
        <Text style={styles.headerMeta}>
          {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min · {recipe.servings} servings ·{' '}
          {recipe.difficulty}
        </Text>
      </View>

      {/* Progress bar */}
      <StepProgressBar
        currentStep={currentStepIndex}
        totalSteps={totalSteps}
        progressPercent={progressPercent}
      />

      {/* Step dots */}
      <StepDots
        totalSteps={totalSteps}
        currentStep={currentStepIndex}
        onStepPress={handleGoToStep}
      />

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Current step card */}
        {currentStep && (
          <StepCard
            step={currentStep}
            stepIndex={currentStepIndex}
            hasTimer={currentStepHasTimer}
            timer={timer}
            onStartTimer={startTimer}
            onShowTimerOverlay={showTimerOverlay}
          />
        )}

        {/* Ingredient sidebar */}
        <IngredientSidebar
          ingredients={ingredients}
          visible={ingredientsVisible}
          onToggle={() => setIngredientsVisible((v) => !v)}
        />

        {/* All steps overview */}
        <View style={styles.allStepsSection}>
          <Text style={styles.allStepsTitle}>All Steps</Text>
          {recipe.steps.map((s, i) => (
            <Pressable
              key={s.step}
              onPress={() => handleGoToStep(i)}
              style={[
                styles.allStepRow,
                i === currentStepIndex && styles.allStepRowActive,
                i < currentStepIndex && styles.allStepRowCompleted,
              ]}
            >
              <View
                style={[
                  styles.allStepNumber,
                  i === currentStepIndex && styles.allStepNumberActive,
                  i < currentStepIndex && styles.allStepNumberCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.allStepNumberText,
                    i === currentStepIndex && styles.allStepNumberTextActive,
                    i < currentStepIndex && styles.allStepNumberTextCompleted,
                  ]}
                >
                  {i < currentStepIndex ? '✓' : s.step}
                </Text>
              </View>
              <Text
                style={[
                  styles.allStepInstruction,
                  i === currentStepIndex && styles.allStepInstructionActive,
                ]}
                numberOfLines={2}
              >
                {s.instruction}
              </Text>
              {s.durationMinutes != null && s.durationMinutes > 0 && (
                <Text style={styles.allStepDuration}>⏱ {s.durationMinutes}m</Text>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Bottom navigation */}
      <NavigationBar
        hasPrev={hasPrevStep}
        hasNext={hasNextStep}
        onPrev={handlePrevStep}
        onNext={handleNextStep}
        onComplete={handleComplete}
        isLastStep={isLastStep}
      />

      {/* Full-screen timer overlay */}
      <MealPrepTimerView
        visible={isTimerOverlayVisible}
        onClose={hideTimerOverlay}
        timer={timer}
        onStart={startTimer}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onReset={resetTimer}
        stepNumber={currentStepIndex + 1}
        stepInstruction={currentStep?.instruction}
        recipeTitle={recipe.title}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  } as TextStyle,
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  } as TextStyle,

  // Header
  header: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '500',
  } as TextStyle,
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  } as TextStyle,
  headerMeta: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  } as TextStyle,

  // Scroll
  scrollContent: {
    flex: 1,
  },
  scrollContentInner: {
    paddingBottom: 24,
  },

  // All steps section
  allStepsSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  allStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  } as TextStyle,
  allStepRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  allStepRowActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  allStepRowCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  allStepNumber: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginRight: 10,
    width: 28,
  },
  allStepNumberActive: {
    backgroundColor: '#2563eb',
  },
  allStepNumberCompleted: {
    backgroundColor: '#22c55e',
  },
  allStepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  } as TextStyle,
  allStepNumberTextActive: {
    color: '#ffffff',
  } as TextStyle,
  allStepNumberTextCompleted: {
    color: '#ffffff',
  } as TextStyle,
  allStepInstruction: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
  } as TextStyle,
  allStepInstructionActive: {
    color: '#111827',
    fontWeight: '500',
  } as TextStyle,
  allStepDuration: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
    marginLeft: 8,
  } as TextStyle,
});

export default MealPrepScreen;
