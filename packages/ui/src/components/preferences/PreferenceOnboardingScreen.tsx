/**
 * PreferenceOnboardingScreen — multi-step preference onboarding wizard
 *
 * Uses SynapsisUI Carousel for step navigation with animated transitions.
 * Steps: dietary restrictions, allergies, cuisine preferences,
 * budget tier, and household size.
 *
 * All preference options sourced from @mealme/shared constants.
 */
import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  type ViewStyle,
  type TextStyle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  DIETARY_RESTRICTION_KEYS,
  getDietaryRestrictionLabel,
  getCuisineTypeLabel,
  BUDGET_TIER_KEYS,
  getBudgetTierLabel,
  getBudgetTierWeeklyRange,
} from '@mealme/shared';
import type { DietaryRestriction, CuisineType, BudgetTier } from '@mealme/shared';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────

/** Onboarding wizard state representing all preference selections. */
export interface OnboardingPreferences {
  dietaryRestrictions: DietaryRestriction[];
  allergies: string[];
  cuisinePreferences: CuisineType[];
  budgetTier: BudgetTier;
  householdSize: number;
}

export interface PreferenceOnboardingScreenProps {
  /** Called when onboarding completes with the selected preferences. */
  onComplete: (preferences: OnboardingPreferences) => void;
  /** Called when the user skips onboarding. */
  onSkip?: () => void;
  /** Initial preferences (for resuming onboarding). */
  initialPreferences?: Partial<OnboardingPreferences>;
  /** Container style */
  style?: ViewStyle;
}

// ─── Default values ──────────────────────────────────────────────────────────

const DEFAULT_PREFERENCES: OnboardingPreferences = {
  dietaryRestrictions: [],
  allergies: [],
  cuisinePreferences: [],
  budgetTier: 'moderate',
  householdSize: 2,
};

// ─── Common Allergies ────────────────────────────────────────────────────────

const COMMON_ALLERGIES = [
  'Peanuts',
  'Tree Nuts',
  'Milk',
  'Eggs',
  'Wheat',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
  'Sulfites',
  'Latex',
  'Penicillin',
] as const;

// ─── Cuisine popularity sort (approximate US popularity) ─────────────────────

const CUISINE_POPULARITY_ORDER: CuisineType[] = [
  'american',
  'mexican',
  'italian',
  'chinese',
  'japanese',
  'indian',
  'thai',
  'mediterranean',
  'korean',
  'vietnamese',
  'french',
  'greek',
  'spanish',
  'southern',
  'cajun',
  'middleEastern',
  'caribbean',
  'filipino',
  'brazilian',
  'african',
];

// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'dietary', title: 'Dietary Restrictions', description: 'Select any dietary restrictions for your household.' },
  { key: 'allergies', title: 'Allergies', description: 'Select known allergies. You can add custom ones too.' },
  { key: 'cuisine', title: 'Cuisine Preferences', description: 'Pick the cuisines your family enjoys most.' },
  { key: 'budget', title: 'Budget Tier', description: 'Choose your weekly grocery budget range.' },
  { key: 'household', title: 'Household Size', description: 'How many people are in your household?' },
] as const;

// ─── Chip (multi-select toggle) ─────────────────────────────────────────────

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: selected ? '#2563eb' : '#f3f4f6',
        borderWidth: 1,
        borderColor: selected ? '#2563eb' : '#e5e7eb',
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: selected ? '#ffffff' : '#374151',
        } as TextStyle}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Step Components ─────────────────────────────────────────────────────────

function DietaryStep({
  selected,
  onToggle,
}: {
  selected: DietaryRestriction[];
  onToggle: (key: DietaryRestriction) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ flexWrap: 'wrap', flexDirection: 'row', paddingBottom: 20 }}>
        {DIETARY_RESTRICTION_KEYS.map((key) => (
          <Chip
            key={key}
            label={getDietaryRestrictionLabel(key)}
            selected={selected.includes(key)}
            onPress={() => onToggle(key)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function AllergiesStep({
  selected,
  onToggle,
  customAllergy,
  onCustomAllergyChange,
  onAddCustomAllergy,
}: {
  selected: string[];
  onToggle: (allergy: string) => void;
  customAllergy: string;
  onCustomAllergyChange: (text: string) => void;
  onAddCustomAllergy: () => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ flexWrap: 'wrap', flexDirection: 'row', paddingBottom: 12 }}>
        {COMMON_ALLERGIES.map((allergy) => (
          <Chip
            key={allergy}
            label={allergy}
            selected={selected.includes(allergy)}
            onPress={() => onToggle(allergy)}
          />
        ))}
      </View>

      {/* Custom allergy input */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 8,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: '#ffffff',
        }}
      >
        <TextInput
          value={customAllergy}
          onChangeText={onCustomAllergyChange}
          placeholder="Add custom allergy..."
          placeholderTextColor="#9ca3af"
          style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' } as TextStyle}
          onSubmitEditing={onAddCustomAllergy}
        />
        <Pressable
          onPress={onAddCustomAllergy}
          style={{
            backgroundColor: customAllergy.trim() ? '#2563eb' : '#d1d5db',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      {/* Show custom allergies that aren't in the common list */}
      {selected.filter((a) => !COMMON_ALLERGIES.includes(a as any)).length > 0 && (
        <View style={{ flexWrap: 'wrap', flexDirection: 'row', marginTop: 12 }}>
          {selected
            .filter((a) => !COMMON_ALLERGIES.includes(a as any))
            .map((allergy) => (
              <Chip
                key={allergy}
                label={allergy}
                selected={true}
                onPress={() => onToggle(allergy)}
              />
            ))}
        </View>
      )}
    </ScrollView>
  );
}

function CuisineStep({
  selected,
  onToggle,
}: {
  selected: CuisineType[];
  onToggle: (key: CuisineType) => void;
}) {
  // Sorted by popularity
  const sortedCuisines = CUISINE_POPULARITY_ORDER;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ flexWrap: 'wrap', flexDirection: 'row', paddingBottom: 20 }}>
        {sortedCuisines.map((key) => (
          <Chip
            key={key}
            label={getCuisineTypeLabel(key)}
            selected={selected.includes(key)}
            onPress={() => onToggle(key)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function BudgetStep({
  selected,
  onSelect,
}: {
  selected: BudgetTier;
  onSelect: (tier: BudgetTier) => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      {BUDGET_TIER_KEYS.map((key) => {
        const range = getBudgetTierWeeklyRange(key);
        const isSelected = selected === key;

        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 16,
              paddingHorizontal: 20,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: isSelected ? '#2563eb' : '#e5e7eb',
              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isSelected ? '#2563eb' : '#111827',
                } as TextStyle}
              >
                {getBudgetTierLabel(key)}
              </Text>
              {range && (
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 } as TextStyle}>
                  ${range[0]} – ${range[1]} / week
                </Text>
              )}
            </View>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: isSelected ? '#2563eb' : '#d1d5db',
                backgroundColor: isSelected ? '#2563eb' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#ffffff',
                  }}
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function HouseholdStep({
  size,
  onChange,
}: {
  size: number;
  onChange: (size: number) => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: '#eff6ff',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 48, fontWeight: '700', color: '#2563eb' } as TextStyle}>
          {size}
        </Text>
      </View>
      <Text style={{ fontSize: 15, color: '#6b7280', marginBottom: 24 } as TextStyle}>
        people in your household
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          onPress={() => onChange(Math.max(1, size - 1))}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: '#f3f4f6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 24,
          }}
        >
          <Text style={{ fontSize: 28, color: '#374151', fontWeight: '300' }}>−</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange(Math.min(20, size + 1))}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: '#2563eb',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 24,
          }}
        >
          <Text style={{ fontSize: 28, color: '#ffffff', fontWeight: '300' }}>+</Text>
        </Pressable>
        </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PreferenceOnboardingScreen({
  onComplete,
  onSkip,
  initialPreferences,
  style,
}: PreferenceOnboardingScreenProps) {
  const [prefs, setPrefs] = useState<OnboardingPreferences>({
    ...DEFAULT_PREFERENCES,
    ...initialPreferences,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [customAllergy, setCustomAllergy] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const totalSteps = STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;
  const step = STEPS[currentStep];

  // ── Navigation ───────────────────────────────────────────────────────────

  const goToStep = useCallback((index: number) => {
    setCurrentStep(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete(prefs);
    } else {
      goToStep(currentStep + 1);
    }
  }, [isLastStep, currentStep, prefs, onComplete, goToStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete(prefs);
    }
  }, [onSkip, onComplete, prefs]);

  // ── Toggle handlers ──────────────────────────────────────────────────────

  const toggleDietary = useCallback((key: DietaryRestriction) => {
    setPrefs((prev) => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(key)
        ? prev.dietaryRestrictions.filter((k) => k !== key)
        : [...prev.dietaryRestrictions, key],
    }));
  }, []);

  const toggleAllergy = useCallback((allergy: string) => {
    setPrefs((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies, allergy],
    }));
  }, []);

  const addCustomAllergy = useCallback(() => {
    const trimmed = customAllergy.trim();
    if (trimmed && !prefs.allergies.includes(trimmed)) {
      setPrefs((prev) => ({
        ...prev,
        allergies: [...prev.allergies, trimmed],
      }));
    }
    setCustomAllergy('');
  }, [customAllergy, prefs.allergies]);

  const toggleCuisine = useCallback((key: CuisineType) => {
    setPrefs((prev) => ({
      ...prev,
      cuisinePreferences: prev.cuisinePreferences.includes(key)
        ? prev.cuisinePreferences.filter((k) => k !== key)
        : [...prev.cuisinePreferences, key],
    }));
  }, []);

  const selectBudgetTier = useCallback((tier: BudgetTier) => {
    setPrefs((prev) => ({ ...prev, budgetTier: tier }));
  }, []);

  const setHouseholdSize = useCallback((size: number) => {
    setPrefs((prev) => ({ ...prev, householdSize: size }));
  }, []);

  // ── Render step content ──────────────────────────────────────────────────

  const renderStepContent = useCallback(
    (stepKey: string) => {
      switch (stepKey) {
        case 'dietary':
          return (
            <DietaryStep
              selected={prefs.dietaryRestrictions}
              onToggle={toggleDietary}
            />
          );
        case 'allergies':
          return (
            <AllergiesStep
              selected={prefs.allergies}
              onToggle={toggleAllergy}
              customAllergy={customAllergy}
              onCustomAllergyChange={setCustomAllergy}
              onAddCustomAllergy={addCustomAllergy}
            />
          );
        case 'cuisine':
          return (
            <CuisineStep
              selected={prefs.cuisinePreferences}
              onToggle={toggleCuisine}
            />
          );
        case 'budget':
          return (
            <BudgetStep
              selected={prefs.budgetTier}
              onSelect={selectBudgetTier}
            />
          );
        case 'household':
          return (
            <HouseholdStep
              size={prefs.householdSize}
              onChange={setHouseholdSize}
            />
          );
        default:
          return null;
      }
    },
    [
      prefs.dietaryRestrictions,
      prefs.allergies,
      prefs.cuisinePreferences,
      prefs.budgetTier,
      prefs.householdSize,
      customAllergy,
      toggleDietary,
      toggleAllergy,
      addCustomAllergy,
      toggleCuisine,
      selectBudgetTier,
      setHouseholdSize,
    ],
  );

  // ── Carousel scroll handler ──────────────────────────────────────────────

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_W);
      if (index !== currentStep && index >= 0 && index < totalSteps) {
        setCurrentStep(index);
      }
    },
    [currentStep, totalSteps],
  );

  return (
    <View style={[{ flex: 1, backgroundColor: '#ffffff' }, style]}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {currentStep > 0 ? (
          <Pressable onPress={handleBack}>
            <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '500' } as TextStyle}>
              Back
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500' } as TextStyle}>
          Step {currentStep + 1} of {totalSteps}
        </Text>
        <Pressable onPress={handleSkip}>
          <Text style={{ color: '#6b7280', fontSize: 15, fontWeight: '500' } as TextStyle}>
            Skip
          </Text>
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: '#e5e7eb',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: '#2563eb',
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
            }}
          />
        </View>
      </View>

      {/* Step title & description */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: '#111827',
            marginBottom: 6,
          } as TextStyle}
        >
          {step.title}
        </Text>
        <Text style={{ fontSize: 15, color: '#6b7280', lineHeight: 22 } as TextStyle}>
          {step.description}
        </Text>
      </View>

      {/* Step content (Carousel) */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={STEPS}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_W, paddingHorizontal: 20, flex: 1 }}>
              {renderStepContent(item.key)}
            </View>
          )}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyExtractor={(_, index) => `step-${index}`}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          scrollEnabled={false}
        />
      </View>

      {/* Pagination dots */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          paddingVertical: 12,
        }}
      >
        {STEPS.map((_, index) => (
          <Pressable
            key={`dot-${index}`}
            onPress={() => goToStep(index)}
            style={{
              width: index === currentStep ? 24 : 8,
              height: 8,
              borderRadius: 4,
              marginHorizontal: 4,
              backgroundColor: index === currentStep ? '#2563eb' : '#d1d5db',
            }}
          />
        ))}
      </View>

      {/* Action button */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <Pressable
          onPress={handleNext}
          style={{
            backgroundColor: '#2563eb',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
            {isLastStep ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default PreferenceOnboardingScreen;
