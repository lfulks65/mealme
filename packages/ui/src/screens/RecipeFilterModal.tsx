import React, { useState, useCallback } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
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
      {selected ? '✓ ' : ''}
      {label}
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
    <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
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
    initialFilters.cuisine ? [initialFilters.cuisine] : [],
  );
  const [selectedDietary, setSelectedDietary] = useState<string[]>(
    initialFilters.dietary_restrictions ?? [],
  );
  const [selectedTime, setSelectedTime] = useState<number | null>(
    initialFilters.max_prep_minutes ?? null,
  );
  const [selectedCalories, setSelectedCalories] = useState<number | null>(
    initialFilters.max_calories ?? null,
  );

  // Toggle a multi-select item
  const toggleItem = useCallback((list: string[], item: string): string[] => {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  }, []);

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
      filters.max_total_minutes = selectedTime;
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
          <Text style={styles.headerTitle}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
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
  applyButton: {
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bottomSpacer: {
    height: 20,
  },
  cancelText: {
    color: '#666666',
    fontSize: 16,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E5E5',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  chipText: {
    color: '#333333',
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    borderTopColor: '#E5E5E5',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#E5E5E5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '700',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  radioCircle: {
    alignItems: 'center',
    borderColor: '#CCCCCC',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginRight: 12,
    width: 20,
  },
  radioCircleSelected: {
    borderColor: '#FF6B35',
  },
  radioDot: {
    backgroundColor: '#FF6B35',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  radioLabel: {
    color: '#333333',
    fontSize: 15,
  },
  radioLabelSelected: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  radioOption: {
    alignItems: 'center',
    borderBottomColor: '#F5F5F5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  radioOptionSelected: {
    // No extra style needed — the circle handles it
  },
  resetText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
});
