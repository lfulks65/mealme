/**
 * useMealPrep — hook for meal prep step navigation and timer state.
 *
 * Provides:
 *   - Current step index and navigation (next/prev/goTo)
 *   - Progress computation (steps completed / total steps)
 *   - Timer state for steps with durations
 *   - Pause/resume/reset timer controls
 *   - Notification scheduling on timer completion
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Recipe, RecipeStep } from '@mealme/shared';

// ─── Timer State ────────────────────────────────────────────────────────────

export interface TimerState {
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Remaining seconds on the timer */
  remainingSeconds: number;
  /** Total seconds the timer was set for */
  totalSeconds: number;
  /** Whether the timer has completed */
  isComplete: boolean;
}

// ─── Hook Result ────────────────────────────────────────────────────────────

export interface UseMealPrepResult {
  /** The recipe being prepared */
  recipe: Recipe | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;

  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Current step data */
  currentStep: RecipeStep | null;
  /** Total number of steps */
  totalSteps: number;
  /** Progress as a percentage (0–100) */
  progressPercent: number;
  /** Whether the current step has a timer */
  currentStepHasTimer: boolean;

  /** Navigate to next step */
  nextStep: () => void;
  /** Navigate to previous step */
  prevStep: () => void;
  /** Navigate to a specific step (0-based) */
  goToStep: (index: number) => void;
  /** Whether there is a next step */
  hasNextStep: boolean;
  /** Whether there is a previous step */
  hasPrevStep: boolean;

  /** Timer state for the current step */
  timer: TimerState;
  /** Start the timer for the current step */
  startTimer: () => void;
  /** Pause the timer */
  pauseTimer: () => void;
  /** Resume a paused timer */
  resumeTimer: () => void;
  /** Reset the timer to the full duration */
  resetTimer: () => void;
  /** Whether the timer overlay is visible */
  isTimerOverlayVisible: boolean;
  /** Show the full-screen timer overlay */
  showTimerOverlay: () => void;
  /** Hide the full-screen timer overlay */
  hideTimerOverlay: () => void;

  /** Refresh the recipe data */
  refresh: () => void;
}

// ─── Notification helper ────────────────────────────────────────────────────

async function scheduleTimerNotification(stepNumber: number, recipeTitle: string) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Timer Complete! ⏰',
        body: `Step ${stepNumber} of "${recipeTitle}" is done.`,
        sound: true,
      },
      trigger: null, // immediate
    });
  } catch {
    // expo-notifications not available, skip
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useMealPrep(
  recipeId: string | null,
  initialRecipe?: Recipe | null,
): UseMealPrepResult {
  const [recipe, setRecipe] = useState<Recipe | null>(initialRecipe ?? null);
  const [loading, setLoading] = useState(!initialRecipe && !!recipeId);
  const [error, setError] = useState<string | null>(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Timer state
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    remainingSeconds: 0,
    totalSeconds: 0,
    isComplete: false,
  });
  const [isTimerOverlayVisible, setIsTimerOverlayVisible] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartTimeRef = useRef<number>(0);
  const timerPausedRemainingRef = useRef<number>(0);

  // ── Fetch recipe ──
  const fetchRecipe = useCallback(async () => {
    if (!recipeId) return;
    if (initialRecipe) return; // Already have it

    setLoading(true);
    setError(null);
    try {
      // Dynamic import to avoid requiring API at module level
      const api = await import('@mealme/api');
      // Try to use a recipe fetch function if available
      if (typeof (api as any).getRecipe === 'function') {
        const result = await (api as any).getRecipe(recipeId);
        if (result.error) {
          setError(result.error);
        } else {
          setRecipe(result.recipe);
        }
      } else {
        setError('Recipe fetching not available');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  }, [recipeId, initialRecipe]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  // ── Computed values ──
  const steps = recipe?.steps ?? [];
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] ?? null;
  const progressPercent =
    totalSteps === 0 ? 0 : Math.round(((currentStepIndex + 1) / totalSteps) * 100);
  const currentStepHasTimer =
    currentStep?.durationMinutes != null && currentStep.durationMinutes > 0;
  const hasNextStep = currentStepIndex < totalSteps - 1;
  const hasPrevStep = currentStepIndex > 0;

  // ── Navigation ──
  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
    // Reset timer for new step
    setTimer({
      isRunning: false,
      remainingSeconds: 0,
      totalSeconds: 0,
      isComplete: false,
    });
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    setTimer({
      isRunning: false,
      remainingSeconds: 0,
      totalSeconds: 0,
      isComplete: false,
    });
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStepIndex(index);
        setTimer({
          isRunning: false,
          remainingSeconds: 0,
          totalSeconds: 0,
          isComplete: false,
        });
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    },
    [totalSteps],
  );

  // ── Timer controls ──
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (!currentStep?.durationMinutes) return;

    const totalSec = currentStep.durationMinutes * 60;
    clearTimerInterval();

    setTimer({
      isRunning: true,
      remainingSeconds: totalSec,
      totalSeconds: totalSec,
      isComplete: false,
    });

    timerStartTimeRef.current = Date.now();
    timerPausedRemainingRef.current = totalSec;

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTimeRef.current) / 1000);
      const remaining = Math.max(0, timerPausedRemainingRef.current - elapsed);

      setTimer((prev) => ({
        ...prev,
        remainingSeconds: remaining,
        isComplete: remaining === 0,
      }));

      if (remaining === 0) {
        clearTimerInterval();
        // Schedule notification
        if (recipe) {
          scheduleTimerNotification(currentStepIndex + 1, recipe.title);
        }
      }
    }, 250); // Update 4x/sec for smooth countdown
  }, [currentStep, clearTimerInterval, recipe, currentStepIndex]);

  const pauseTimer = useCallback(() => {
    if (!timer.isRunning) return;
    clearTimerInterval();

    // Save remaining time for resume
    timerPausedRemainingRef.current = timer.remainingSeconds;

    setTimer((prev) => ({ ...prev, isRunning: false }));
  }, [timer.isRunning, timer.remainingSeconds, clearTimerInterval]);

  const resumeTimer = useCallback(() => {
    if (timer.isRunning || timer.isComplete) return;

    timerStartTimeRef.current = Date.now();
    // timerPausedRemainingRef.current already holds the remaining time

    setTimer((prev) => ({ ...prev, isRunning: true }));

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTimeRef.current) / 1000);
      const remaining = Math.max(0, timerPausedRemainingRef.current - elapsed);

      setTimer((prev) => ({
        ...prev,
        remainingSeconds: remaining,
        isComplete: remaining === 0,
      }));

      if (remaining === 0) {
        clearTimerInterval();
        if (recipe) {
          scheduleTimerNotification(currentStepIndex + 1, recipe.title);
        }
      }
    }, 250);
  }, [timer.isRunning, timer.isComplete, clearTimerInterval, recipe, currentStepIndex]);

  const resetTimer = useCallback(() => {
    clearTimerInterval();
    setTimer({
      isRunning: false,
      remainingSeconds: 0,
      totalSeconds: 0,
      isComplete: false,
    });
  }, [clearTimerInterval]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ── Timer overlay ──
  const showTimerOverlay = useCallback(() => {
    setIsTimerOverlayVisible(true);
  }, []);

  const hideTimerOverlay = useCallback(() => {
    setIsTimerOverlayVisible(false);
  }, []);

  return {
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
    refresh: fetchRecipe,
  };
}

export default useMealPrep;
