import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { RecipeSearchFilters } from '@mealme/shared';

// ── Filter Option Lists ──────────────────────────────────────────────────────

const CUISINE_OPTIONS = [
  'Mediterranean',
  'Italian',
  'Thai',
  'Japanese',
  'Mexican',
  'American',
  'Indian',
  'Korean',
];

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'low-sodium',
];

const TIME_RANGES = [
  { label: 'Any', value: null },
  { label: '≤ 15 min', value: 15 },
  { label: '≤ 30 min', value: 30 },
  { label: '≤ 45 min', value: 45 },
  { label: '≤ 60 min', value: 60 },
  { label: '≤ 90 min', value: 90 },
];

const CALORIE_RANGES = [
  { label: 'Any', value: null },
  { label: '≤ 200 cal', value: 200 },
  { label: '≤ 300 cal', value: 300 },
  { label: '≤ 500 cal', value: 500 },
  { label: '≤ 700 cal', value: 700 },
  { label: '≤ 1000 cal', value: 1000 },
];

// ── Multi-Select Chip ─────────────────────────────────────────────────────────

interface MultiSelectChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const MultiSelectChip: React.FC<MultiSelectChipProps> = ({ label, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, selected && styles.chipSelected]}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {selected ? '✓ ' : ''}{label}
    </Text>
  </Pressable>
);

// ── Radio Option ──────────────────────────────────────────────────────────────

interface RadioOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const RadioOption: React.FC<RadioOptionProps> = ({ label, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[styles.radioOption, selected && styles.radioOptionSelected]}
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
  >
    <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
    <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>
      {label}
    </Text>
  </Pressable>
);

// ── RecipeFilterModal ─────────────────────────────────────────────────────────

export interface RecipeFilterModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Close handler */
  onClose: () => void;
  /** Apply filters handler */
  onApply: (filters: RecipeSearchFilters) => void;
  /** Initial filter state */
  initialFilters?: RecipeSearchFilters;
}

export const RecipeFilterModal: React.FC<RecipeFilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
}) => {
  // Local state for each filter group
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    initialFilters.cuisine ? [initialFilters.cuisine] : []
  );
  const [selectedDietary, setSelectedDietary] = useState<string[]>(
    initialFilters.dietary_restrictions ?? []
  );
  const [selectedTime, setSelectedTime] = useState<number | null>(
    initialFilters.max_prep_minutes ?? null
  );
  const [selectedCalories, setSelectedCalories] = useState<number | null>(
    initialFilters.max_calories ?? null
  );

  // Toggle a multi-select item
  const toggleItem = useCallback(
    (list: string[], item: string): string[] => {
      return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
    },
    []
  );

  // Apply filters
  const handleApply = useCallback(() => {
    const filters: RecipeSearchFilters = {};
    if (selectedCuisines.length > 0) {
      // Use the first selected cuisine for the cuisine field
      // (API supports single cuisine, but modal allows multi for future extensibility)
      filters.cuisine = selectedCuisines[0];
    }
    if (selectedDietary.length > 0) {
      filters.dietary_restrictions = selectedDietary;
    }
    if (selectedTime !== null) {
      filters.max_prep_minutes = selectedTime;
      filters.max_cook_minutes = selectedTime;
    }
    if (selectedCalories !== null) {
      filters.max_calories = selectedCalories;
    }
    onApply(filters);
    onClose();
  }, [selectedCuisines, selectedDietary, selectedTime, selectedCalories, onApply, onClose]);

  // Reset all filters
  const handleReset = useCallback(() => {
    setSelectedCuisines([]);
    setSelectedDietary([]);
    setSelectedTime(null);
    setSelectedCalories(null);
  }, []);

  const activeFilterCount =
    (selectedCuisines.length > 0 ? 1 : 0) +
    selectedDietary.length +
    (selectedTime !== null ? 1 : 0) +
    (selectedCalories !== null ? 1 : 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal
      accessibilityLabel="Recipe filter modal"
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Text>
          <Pressable onPress={handleReset} hitSlop={8}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* Cuisine Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🍽️ Cuisine</Text>
            <View style={styles.chipsGrid}>
              {CUISINE_OPTIONS.map((cuisine) => (
                <MultiSelectChip
                  key={cuisine}
                  label={cuisine}
                  selected={selectedCuisines.includes(cuisine)}
                  onPress={() => setSelectedCuisines((prev) => toggleItem(prev, cuisine))}
                />
              ))}
            </View>
          </View>

          {/* Dietary Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🥗 Dietary</Text>
            <View style={styles.chipsGrid}>
              {DIETARY_OPTIONS.map((diet) => (
                <MultiSelectChip
                  key={diet}
                  label={diet}
                  selected={selectedDietary.includes(diet)}
                  onPress={() => setSelectedDietary((prev) => toggleItem(prev, diet))}
                />
              ))}
            </View>
          </View>

          {/* Time Range Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏱️ Time Range</Text>
            {TIME_RANGES.map((range) => (
              <RadioOption
                key={range.label}
                label={range.label}
                selected={selectedTime === range.value}
                onPress={() => setSelectedTime(range.value)}
              />
            ))}
          </View>

          {/* Calorie Range Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Calorie Range</Text>
            {CALORIE_RANGES.map((range) => (
              <RadioOption
                key={range.label}
                label={range.label}
                selected={selectedCalories === range.value}
                onPress={() => setSelectedCalories(range.value)}
              />
            ))}
          </View>

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.footer}>
          <Pressable
            style={styles.applyButton}
            onPress={handleApply}
            accessibilityRole="button"
            accessibilityLabel="Apply filters"
          >
            <Text style={styles.applyButtonText}>
              Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  cancelText: {
    fontSize: 16,
    color: '#666666',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  resetText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  chipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  chipText: {
    fontSize: 14,
    color: '#333333',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  radioOptionSelected: {
    // No extra style needed — the circle handles it
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#FF6B35',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B35',
  },
  radioLabel: {
    fontSize: 15,
    color: '#333333',
  },
  radioLabelSelected: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  applyButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
