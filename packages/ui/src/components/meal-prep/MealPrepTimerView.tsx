/**
 * MealPrepTimerView — full-screen timer overlay for meal prep.
 *
 * Features:
 *   - Full-screen countdown display with large time readout
 *   - Pause / Resume / Reset controls
 *   - Animated progress ring around the countdown
 *   - Step info (step number, instruction preview)
 *   - Notification on completion (Expo notifications on mobile)
 *   - Haptic feedback on button presses
 *   - Close button to dismiss overlay
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { HapticButton } from '../bna/HapticButton';
import type { TimerState } from './useMealPrep';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MealPrepTimerViewProps {
  /** Whether the timer overlay is visible */
  visible: boolean;
  /** Called to dismiss the overlay */
  onClose: () => void;
  /** Current timer state */
  timer: TimerState;
  /** Start the timer */
  onStart: () => void;
  /** Pause the timer */
  onPause: () => void;
  /** Resume a paused timer */
  onResume: () => void;
  /** Reset the timer */
  onReset: () => void;
  /** Step number (1-based) for display */
  stepNumber: number;
  /** Short instruction text for the step */
  stepInstruction?: string;
  /** Recipe title for context */
  recipeTitle?: string;
  /** Container style */
  style?: ViewStyle;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MealPrepTimerView({
  visible,
  onClose,
  timer,
  onStart,
  onPause,
  onResume,
  onReset,
  stepNumber,
  stepInstruction,
  recipeTitle,
  style,
}: MealPrepTimerViewProps) {
  const { isRunning, remainingSeconds, totalSeconds, isComplete } = timer;

  // Pulse animation for completion state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Ring progress animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (totalSeconds > 0) {
      const progress = remainingSeconds / totalSeconds;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.linear,
      }).start();
    }
  }, [remainingSeconds, totalSeconds, progressAnim]);

  // Pulse on completion
  useEffect(() => {
    if (isComplete) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isComplete, pulseAnim]);

  const progressPercent =
    totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;

  // Determine button state
  const showStart = !isRunning && !isComplete && remainingSeconds === 0;
  const showPause = isRunning;
  const showResume = !isRunning && !isComplete && remainingSeconds > 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, style]}>
        {/* Close button */}
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>

        {/* Context */}
        <View style={styles.contextSection}>
          {recipeTitle && (
            <Text style={styles.recipeTitle} numberOfLines={1}>
              {recipeTitle}
            </Text>
          )}
          <Text style={styles.stepLabel}>Step {stepNumber}</Text>
        </View>

        {/* Timer Display */}
        <View style={styles.timerSection}>
          <Animated.View
            style={[
              styles.timerCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {/* Progress ring (simulated with border) */}
            <View
              style={[
                styles.timerRing,
                {
                  borderColor: isComplete
                    ? '#22c55e'
                    : isRunning
                      ? '#2563eb'
                      : '#9ca3af',
                },
              ]}
            >
              <Text
                style={[
                  styles.timerText,
                  isComplete && styles.timerTextComplete,
                ]}
              >
                {isComplete ? 'Done!' : formatTime(remainingSeconds)}
              </Text>
            </View>
          </Animated.View>

          {/* Progress bar below */}
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: isComplete ? '#22c55e' : '#2563eb',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Step instruction preview */}
        {stepInstruction && (
          <View style={styles.instructionSection}>
            <Text style={styles.instructionText} numberOfLines={3}>
              {stepInstruction}
            </Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controlsSection}>
          {showStart && (
            <HapticButton
              title="Start Timer"
              onPress={onStart}
              size="lg"
              fullWidth
            />
          )}

          {showPause && (
            <View style={styles.controlRow}>
              <HapticButton
                title="Pause"
                onPress={onPause}
                variant="outline"
                size="lg"
                style={styles.controlButton}
              />
              <HapticButton
                title="Reset"
                onPress={onReset}
                variant="ghost"
                size="lg"
                style={styles.controlButton}
              />
            </View>
          )}

          {showResume && (
            <View style={styles.controlRow}>
              <HapticButton
                title="Resume"
                onPress={onResume}
                size="lg"
                style={styles.controlButton}
              />
              <HapticButton
                title="Reset"
                onPress={onReset}
                variant="ghost"
                size="lg"
                style={styles.controlButton}
              />
            </View>
          )}

          {isComplete && (
            <View style={styles.controlRow}>
              <HapticButton
                title="Dismiss"
                onPress={onClose}
                size="lg"
                style={styles.controlButton}
              />
              <HapticButton
                title="Restart"
                onPress={() => {
                  onReset();
                  onStart();
                }}
                variant="outline"
                size="lg"
                style={styles.controlButton}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '400',
  } as TextStyle,

  // Context
  contextSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  recipeTitle: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '400',
    marginBottom: 4,
  } as TextStyle,
  stepLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,

  // Timer
  timerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  timerText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  timerTextComplete: {
    color: '#22c55e',
  } as TextStyle,

  // Progress bar
  progressRow: {
    width: 240,
    marginTop: 16,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Instruction
  instructionSection: {
    maxWidth: 320,
    marginBottom: 32,
  },
  instructionText: {
    fontSize: 15,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,

  // Controls
  controlsSection: {
    width: '100%',
    maxWidth: 360,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    flex: 1,
  },
});

export default MealPrepTimerView;
