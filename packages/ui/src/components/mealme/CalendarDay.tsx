/**
 * CalendarDay — single day cell for the meal plan calendar view
 *
 * Shows the day number and assigned meals as compact chips
 * color-coded by meal slot. Supports today/selected/current-month
 * visual states and press handlers for the cell and individual meals.
 */
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { MealSlot } from '@mealme/shared';

// ── Public Types ────────────────────────────────────────────────────────────

export interface CalendarMeal {
  /** Which meal slot this entry belongs to */
  mealSlot: MealSlot;
  /** Display title of the recipe */
  recipeTitle: string;
  /** Recipe ID — passed to onMealPress */
  recipeId: string;
}

export interface CalendarDayProps {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Meals assigned to this day */
  meals: CalendarMeal[];
  /** Highlight as today (blue dot under number) */
  isToday?: boolean;
  /** Highlight as selected (blue background) */
  isSelected?: boolean;
  /** Whether this day belongs to the current month — defaults to true */
  isCurrentMonth?: boolean;
  /** Tap the day cell */
  onPress?: (date: string) => void;
  /** Tap a specific meal chip */
  onMealPress?: (recipeId: string, mealSlot: MealSlot) => void;
  /** Container style override */
  style?: ViewStyle;
}

// ── Color Helpers ───────────────────────────────────────────────────────────

const MEAL_SLOT_COLORS: Record<string, { bg: string; text: string }> = {
  breakfast: { bg: '#fef3c7', text: '#92400e' }, // orange
  morningSnack: { bg: '#fce7f3', text: '#9d174d' }, // purple-ish
  lunch: { bg: '#dcfce7', text: '#166534' }, // green
  afternoonSnack: { bg: '#fce7f3', text: '#9d174d' }, // purple-ish
  dinner: { bg: '#dbeafe', text: '#1e40af' }, // blue
  eveningSnack: { bg: '#fce7f3', text: '#9d174d' }, // purple-ish
};

const MAX_VISIBLE_MEALS = 3;

// ── Component ───────────────────────────────────────────────────────────────

export function CalendarDay({
  date,
  meals,
  isToday = false,
  isSelected = false,
  isCurrentMonth = true,
  onPress,
  onMealPress,
  style,
}: CalendarDayProps) {
  const handlePress = useCallback(() => {
    onPress?.(date);
  }, [onPress, date]);

  const visibleMeals = meals.slice(0, MAX_VISIBLE_MEALS);
  const overflowCount = meals.length - MAX_VISIBLE_MEALS;

  // Extract day number from YYYY-MM-DD
  const dayNumber = parseInt(date.split('-')[2], 10);

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      style={[
        styles.cell,
        isSelected && styles.cellSelected,
        !isCurrentMonth && styles.cellMuted,
        style,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Day ${dayNumber}, ${meals.length} meal${meals.length !== 1 ? 's' : ''}`}
    >
      {/* Day number + today indicator */}
      <View style={styles.header}>
        <Text
          style={[
            styles.dayNumber,
            isSelected && styles.dayNumberSelected,
            !isCurrentMonth && styles.dayNumberMuted,
          ]}
        >
          {dayNumber}
        </Text>
        {isToday && <View style={styles.todayDot} />}
      </View>

      {/* Meal chips */}
      {visibleMeals.length > 0 && (
        <View style={styles.mealsContainer}>
          {visibleMeals.map((meal) => {
            const colors = MEAL_SLOT_COLORS[meal.mealSlot] ?? {
              bg: '#f3f4f6',
              text: '#374151',
            };

            const chip = (
              <View
                key={`${meal.mealSlot}-${meal.recipeId}`}
                style={[styles.mealChip, { backgroundColor: colors.bg }]}
              >
                <Text style={[styles.mealChipText, { color: colors.text }]} numberOfLines={1}>
                  {meal.recipeTitle}
                </Text>
              </View>
            );

            if (onMealPress) {
              return (
                <Pressable
                  key={`${meal.mealSlot}-${meal.recipeId}`}
                  onPress={() => onMealPress(meal.recipeId, meal.mealSlot)}
                  style={styles.mealChipPressable}
                >
                  {chip}
                </Pressable>
              );
            }

            return chip;
          })}

          {/* Overflow indicator */}
          {overflowCount > 0 && <Text style={styles.overflowText}>+{overflowCount} more</Text>}
        </View>
      )}
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cell: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    minHeight: 80,
    padding: 6,
  },
  cellMuted: {
    opacity: 0.4,
  },
  cellSelected: {
    backgroundColor: '#eff6ff',
  },
  dayNumber: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  dayNumberMuted: {
    color: '#9ca3af',
  },
  dayNumberSelected: {
    color: '#2563eb',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  mealChip: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mealChipPressable: {
    // Wrapper so Pressable doesn't interfere with chip layout
  },
  mealChipText: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
  mealsContainer: {
    gap: 3,
  },
  overflowText: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '500',
    paddingLeft: 2,
    paddingTop: 1,
  },
  todayDot: {
    backgroundColor: '#2563eb',
    borderRadius: 2.5,
    height: 5,
    marginLeft: 4,
    width: 5,
  },
});

export default CalendarDay;
