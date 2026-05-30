/**
 * PreferenceSettingsScreen — edit existing family & member preferences
 *
 * Shows family-level preferences with per-member override support.
 * Uses @mealme/ui form components + SynapsisUI animated toggles.
 * All preference options sourced from @mealme/shared constants.
 *
 * Features:
 *   - Family-level preference editing (dietary, allergies, cuisine, budget, household)
 *   - Per-member overrides with toggle to enable custom prefs
 *   - Save/cancel actions with Supabase persistence
 *   - Aggregated preference preview
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import {
  DIETARY_RESTRICTION_KEYS,
  getDietaryRestrictionLabel,
  getCuisineTypeLabel,
  BUDGET_TIER_KEYS,
  getBudgetTierLabel,
  getBudgetTierWeeklyRange,
} from '@mealme/shared';
import type {
  DietaryRestriction,
  CuisineType,
  BudgetTier,
} from '@mealme/shared';
import type {
  MemberPreferencesRow,
  UpsertFamilyPreferencesInput,
  UpsertMemberPreferencesInput,
} from '@mealme/api';
import {
  getFamilyPreferences,
  upsertFamilyPreferences,
  getMemberPreferences,
  upsertMemberPreferences,
} from '@mealme/api';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A member with their preferences (or null if no override exists). */
export interface MemberWithPreferences {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  preferences: MemberPreferencesRow | null;
}

export interface PreferenceSettingsScreenProps {
  /** The family ID to manage preferences for. */
  familyId: string;
  /** Current user ID (for own member preferences). */
  currentUserId: string;
  /** Members of the family (for per-member overrides). */
  members: MemberWithPreferences[];
  /** Called when preferences are saved successfully. */
  onSaved?: () => void;
  /** Called when the user cancels / navigates back. */
  onCancel?: () => void;
  /** Container style */
  style?: ViewStyle;
}

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
] as const;

// ─── Cuisine popularity sort ─────────────────────────────────────────────────

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

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'family', label: 'Family' },
  { key: 'members', label: 'Members' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Chip ────────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  size?: 'sm' | 'md';
}

function Chip({ label, selected, onPress, size = 'md' }: ChipProps) {
  const py = size === 'sm' ? 6 : 10;
  const px = size === 'sm' ? 12 : 16;
  const fontSize = size === 'sm' ? 12 : 14;

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: px,
        paddingVertical: py,
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
          fontSize,
          fontWeight: '500',
          color: selected ? '#ffffff' : '#374151',
        } as TextStyle}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 12, marginTop: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' } as TextStyle}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 } as TextStyle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ─── Toggle Switch (inline) ──────────────────────────────────────────────────

function ToggleSwitch({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' } as TextStyle}>
        {label}
      </Text>
      <View
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          backgroundColor: value ? '#2563eb' : '#d1d5db',
          padding: 2,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#ffffff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: 2,
            transform: [{ translateX: value ? 20 : 0 }],
          }}
        />
      </View>
    </Pressable>
  );
}

// ─── Family Preferences Form ──────────────────────────────────────────────────

interface FamilyFormState {
  dietaryRestrictions: DietaryRestriction[];
  allergies: string[];
  cuisinePreferences: CuisineType[];
  budgetTier: BudgetTier;
  householdSize: number;
  customAllergy: string;
}

function FamilyPreferencesForm({
  form,
  setForm,
}: {
  form: FamilyFormState;
  setForm: React.Dispatch<React.SetStateAction<FamilyFormState>>;
}) {
  const toggleDietary = useCallback(
    (key: DietaryRestriction) => {
      setForm((prev) => ({
        ...prev,
        dietaryRestrictions: prev.dietaryRestrictions.includes(key)
          ? prev.dietaryRestrictions.filter((k) => k !== key)
          : [...prev.dietaryRestrictions, key],
      }));
    },
    [setForm],
  );

  const toggleAllergy = useCallback(
    (allergy: string) => {
      setForm((prev) => ({
        ...prev,
        allergies: prev.allergies.includes(allergy)
          ? prev.allergies.filter((a) => a !== allergy)
          : [...prev.allergies, allergy],
      }));
    },
    [setForm],
  );

  const addCustomAllergy = useCallback(() => {
    const trimmed = form.customAllergy.trim();
    if (trimmed && !form.allergies.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        allergies: [...prev.allergies, trimmed],
        customAllergy: '',
      }));
    }
  }, [form.customAllergy, form.allergies, setForm]);

  const toggleCuisine = useCallback(
    (key: CuisineType) => {
      setForm((prev) => ({
        ...prev,
        cuisinePreferences: prev.cuisinePreferences.includes(key)
          ? prev.cuisinePreferences.filter((k) => k !== key)
          : [...prev.cuisinePreferences, key],
      }));
    },
    [setForm],
  );

  const selectBudgetTier = useCallback(
    (tier: BudgetTier) => {
      setForm((prev) => ({ ...prev, budgetTier: tier }));
    },
    [setForm],
  );

  const setHouseholdSize = useCallback(
    (size: number) => {
      setForm((prev) => ({ ...prev, householdSize: size }));
    },
    [setForm],
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      {/* Dietary Restrictions */}
      <SectionHeader title="Dietary Restrictions" subtitle="Select any dietary restrictions for your household." />
      <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
        {DIETARY_RESTRICTION_KEYS.map((key) => (
          <Chip
            key={key}
            label={getDietaryRestrictionLabel(key)}
            selected={form.dietaryRestrictions.includes(key)}
            onPress={() => toggleDietary(key)}
          />
        ))}
      </View>

      {/* Allergies */}
      <SectionHeader title="Allergies" subtitle="Select known allergies. You can add custom ones too." />
      <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
        {COMMON_ALLERGIES.map((allergy) => (
          <Chip
            key={allergy}
            label={allergy}
            selected={form.allergies.includes(allergy)}
            onPress={() => toggleAllergy(allergy)}
          />
        ))}
        {form.allergies
          .filter((a) => !COMMON_ALLERGIES.includes(a as any))
          .map((allergy) => (
            <Chip
              key={allergy}
              label={allergy}
              selected={true}
              onPress={() => toggleAllergy(allergy)}
            />
          ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: '#ffffff',
        }}
      >
        <TextInput
          value={form.customAllergy}
          onChangeText={(text) => setForm((prev) => ({ ...prev, customAllergy: text }))}
          placeholder="Add custom allergy..."
          placeholderTextColor="#9ca3af"
          style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' } as TextStyle}
          onSubmitEditing={addCustomAllergy}
        />
        <Pressable
          onPress={addCustomAllergy}
          style={{
            backgroundColor: form.customAllergy.trim() ? '#2563eb' : '#d1d5db',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      {/* Cuisine Preferences */}
      <SectionHeader title="Cuisine Preferences" subtitle="Pick the cuisines your family enjoys most." />
      <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
        {CUISINE_POPULARITY_ORDER.map((key) => (
          <Chip
            key={key}
            label={getCuisineTypeLabel(key)}
            selected={form.cuisinePreferences.includes(key)}
            onPress={() => toggleCuisine(key)}
          />
        ))}
      </View>

      {/* Budget Tier */}
      <SectionHeader title="Budget Tier" subtitle="Choose your weekly grocery budget range." />
      {BUDGET_TIER_KEYS.map((key) => {
        const range = getBudgetTierWeeklyRange(key);
        const isSelected = form.budgetTier === key;

        return (
          <Pressable
            key={key}
            onPress={() => selectBudgetTier(key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 14,
              paddingHorizontal: 18,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: isSelected ? '#2563eb' : '#e5e7eb',
              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
              marginBottom: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: isSelected ? '#2563eb' : '#111827',
                } as TextStyle}
              >
                {getBudgetTierLabel(key)}
              </Text>
              {range && (
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 } as TextStyle}>
                  ${range[0]} – ${range[1]} / week
                </Text>
              )}
            </View>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isSelected ? '#2563eb' : '#d1d5db',
                backgroundColor: isSelected ? '#2563eb' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' }} />
              )}
            </View>
          </Pressable>
        );
      })}

      {/* Household Size */}
      <SectionHeader title="Household Size" subtitle="How many people are in your household?" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 16,
        }}
      >
        <Pressable
          onPress={() => setHouseholdSize(Math.max(1, form.householdSize - 1))}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#f3f4f6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 20,
          }}
        >
          <Text style={{ fontSize: 24, color: '#374151', fontWeight: '300' }}>−</Text>
        </Pressable>
        <Text style={{ fontSize: 32, fontWeight: '700', color: '#2563eb', minWidth: 40, textAlign: 'center' } as TextStyle}>
          {form.householdSize}
        </Text>
        <Pressable
          onPress={() => setHouseholdSize(Math.min(20, form.householdSize + 1))}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#2563eb',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 20,
          }}
        >
          <Text style={{ fontSize: 24, color: '#ffffff', fontWeight: '300' }}>+</Text>
        </Pressable>
      </View>

      {/* Bottom spacer */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Member Override Form ─────────────────────────────────────────────────────

interface MemberFormState {
  dietaryRestrictions: DietaryRestriction[];
  allergies: string[];
  cuisinePreferences: CuisineType[];
  isOverride: boolean;
  customAllergy: string;
}

function MemberOverrideForm({
  member,
  form,
  setForm,
}: {
  member: MemberWithPreferences;
  form: MemberFormState;
  setForm: React.Dispatch<React.SetStateAction<MemberFormState>>;
}) {
  const toggleDietary = useCallback(
    (key: DietaryRestriction) => {
      setForm((prev) => ({
        ...prev,
        dietaryRestrictions: prev.dietaryRestrictions.includes(key)
          ? prev.dietaryRestrictions.filter((k) => k !== key)
          : [...prev.dietaryRestrictions, key],
      }));
    },
    [setForm],
  );

  const toggleAllergy = useCallback(
    (allergy: string) => {
      setForm((prev) => ({
        ...prev,
        allergies: prev.allergies.includes(allergy)
          ? prev.allergies.filter((a) => a !== allergy)
          : [...prev.allergies, allergy],
      }));
    },
    [setForm],
  );

  const addCustomAllergy = useCallback(() => {
    const trimmed = form.customAllergy.trim();
    if (trimmed && !form.allergies.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        allergies: [...prev.allergies, trimmed],
        customAllergy: '',
      }));
    }
  }, [form.customAllergy, form.allergies, setForm]);

  const toggleCuisine = useCallback(
    (key: CuisineType) => {
      setForm((prev) => ({
        ...prev,
        cuisinePreferences: prev.cuisinePreferences.includes(key)
          ? prev.cuisinePreferences.filter((k) => k !== key)
          : [...prev.cuisinePreferences, key],
      }));
    },
    [setForm],
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      {/* Override toggle */}
      <ToggleSwitch
        value={form.isOverride}
        onValueChange={(v) => setForm((prev) => ({ ...prev, isOverride: v }))}
        label="Use custom preferences"
      />

      {!form.isOverride ? (
        <View
          style={{
            paddingVertical: 24,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center' } as TextStyle}>
            {member.displayName} will use family-level preferences.
            Toggle above to set custom preferences.
          </Text>
        </View>
      ) : (
        <>
          {/* Dietary Restrictions */}
          <SectionHeader
            title="Dietary Restrictions"
            subtitle="Personal dietary restrictions (added to family-level)."
          />
          <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
            {DIETARY_RESTRICTION_KEYS.map((key) => (
              <Chip
                key={key}
                label={getDietaryRestrictionLabel(key)}
                selected={form.dietaryRestrictions.includes(key)}
                onPress={() => toggleDietary(key)}
                size="sm"
              />
            ))}
          </View>

          {/* Allergies */}
          <SectionHeader title="Allergies" subtitle="Personal allergies." />
          <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
            {COMMON_ALLERGIES.map((allergy) => (
              <Chip
                key={allergy}
                label={allergy}
                selected={form.allergies.includes(allergy)}
                onPress={() => toggleAllergy(allergy)}
                size="sm"
              />
            ))}
            {form.allergies
              .filter((a) => !COMMON_ALLERGIES.includes(a as any))
              .map((allergy) => (
                <Chip
                  key={allergy}
                  label={allergy}
                  selected={true}
                  onPress={() => toggleAllergy(allergy)}
                  size="sm"
                />
              ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 12,
              paddingHorizontal: 12,
              backgroundColor: '#ffffff',
            }}
          >
            <TextInput
              value={form.customAllergy}
              onChangeText={(text) => setForm((prev) => ({ ...prev, customAllergy: text }))}
              placeholder="Add custom allergy..."
              placeholderTextColor="#9ca3af"
              style={{ flex: 1, paddingVertical: 10, fontSize: 13, color: '#111827' } as TextStyle}
              onSubmitEditing={addCustomAllergy}
            />
            <Pressable
              onPress={addCustomAllergy}
              style={{
                backgroundColor: form.customAllergy.trim() ? '#2563eb' : '#d1d5db',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>Add</Text>
            </Pressable>
          </View>

          {/* Cuisine Preferences */}
          <SectionHeader title="Cuisine Preferences" subtitle="Personal cuisine preferences." />
          <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
            {CUISINE_POPULARITY_ORDER.map((key) => (
              <Chip
                key={key}
                label={getCuisineTypeLabel(key)}
                selected={form.cuisinePreferences.includes(key)}
                onPress={() => toggleCuisine(key)}
                size="sm"
              />
            ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PreferenceSettingsScreen({
  familyId,
  currentUserId,
  members,
  onSaved,
  onCancel,
  style,
}: PreferenceSettingsScreenProps) {
  // ── Loading & error state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Active tab ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('family');

  // ── Selected member for override editing ───────────────────────────────
  const [selectedMemberIdx, setSelectedMemberIdx] = useState(0);

  // ── Family form state ─────────────────────────────────────────────────
  const [familyForm, setFamilyForm] = useState<FamilyFormState>({
    dietaryRestrictions: [],
    allergies: [],
    cuisinePreferences: [],
    budgetTier: 'moderate',
    householdSize: 2,
    customAllergy: '',
  });

  // ── Member forms state (one per member) ────────────────────────────────
  const [memberForms, setMemberForms] = useState<MemberFormState[]>(
    members.map(() => ({
      dietaryRestrictions: [],
      allergies: [],
      cuisinePreferences: [],
      isOverride: false,
      customAllergy: '',
    })),
  );

  // ── Load existing preferences on mount ─────────────────────────────────
  useEffect(() => {
    async function loadPreferences() {
      setLoading(true);
      setError(null);

      try {
        // Load family preferences
        const familyResult = await getFamilyPreferences(familyId);
        if (familyResult.preferences) {
          const fp = familyResult.preferences;
          setFamilyForm({
            dietaryRestrictions: fp.dietary_restrictions as DietaryRestriction[],
            allergies: fp.allergies as string[],
            cuisinePreferences: fp.cuisine_preferences as CuisineType[],
            budgetTier: fp.budget_tier as BudgetTier,
            householdSize: fp.household_size,
            customAllergy: '',
          });
        }

        // Load each member's preferences
        const memberFormUpdates = await Promise.all(
          members.map(async (member) => {
            const result = await getMemberPreferences(familyId, member.userId);
            if (result.preferences) {
              const mp = result.preferences;
              return {
                dietaryRestrictions: mp.dietary_restrictions as DietaryRestriction[],
                allergies: mp.allergies as string[],
                cuisinePreferences: mp.cuisine_preferences as CuisineType[],
                isOverride: mp.is_override,
                customAllergy: '',
              };
            }
            return {
              dietaryRestrictions: [] as DietaryRestriction[],
              allergies: [] as string[],
              cuisinePreferences: [] as CuisineType[],
              isOverride: false,
              customAllergy: '',
            };
          }),
        );
        setMemberForms(memberFormUpdates);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [familyId, members]);

  // ── Save handler ───────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      // Save family preferences
      const familyInput: UpsertFamilyPreferencesInput = {
        dietaryRestrictions: familyForm.dietaryRestrictions,
        allergies: familyForm.allergies,
        cuisinePreferences: familyForm.cuisinePreferences,
        budgetTier: familyForm.budgetTier,
        householdSize: familyForm.householdSize,
      };
      const familyResult = await upsertFamilyPreferences(familyId, familyInput);
      if (familyResult.error) {
        setError(familyResult.error);
        return;
      }

      // Save member preferences (only for the current user or all if admin)
      for (let i = 0; i < members.length; i++) {
        const memberForm = memberForms[i];
        const member = members[i];

        // Only save if the member has an override or had one before
        const memberInput: UpsertMemberPreferencesInput = {
          dietaryRestrictions: memberForm.dietaryRestrictions,
          allergies: memberForm.allergies,
          cuisinePreferences: memberForm.cuisinePreferences,
          isOverride: memberForm.isOverride,
        };

        const memberResult = await upsertMemberPreferences(familyId, member.userId, memberInput);
        if (memberResult.error && member.userId === currentUserId) {
          // Only surface errors for the current user's own prefs
          setError(memberResult.error);
          return;
        }
      }

      onSaved?.();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }, [familyId, familyForm, members, memberForms, currentUserId, onSaved]);

  // ── Update a single member form ───────────────────────────────────────

  const updateMemberForm = useCallback(
    (idx: number, updater: (prev: MemberFormState) => MemberFormState) => {
      setMemberForms((prev) => {
        const next = [...prev];
        next[idx] = updater(next[idx]);
        return next;
      });
    },
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }, style]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 12, fontSize: 14, color: '#6b7280' } as TextStyle}>
          Loading preferences...
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: '#ffffff' }, style]}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {onCancel ? (
            <Pressable onPress={onCancel}>
              <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '500' } as TextStyle}>Cancel</Text>
            </Pressable>
          ) : (
            <View style={{ width: 50 }} />
          )}
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827' } as TextStyle}>
            Preferences
          </Text>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text
              style={{
                color: saving ? '#9ca3af' : '#2563eb',
                fontSize: 15,
                fontWeight: '600',
              } as TextStyle}
            >
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Error banner */}
      {error && (
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: '#fef2f2',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#fecaca',
          }}
        >
          <Text style={{ fontSize: 13, color: '#dc2626' } as TextStyle}>{error}</Text>
        </View>
      )}

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12 }}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? '#2563eb' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: activeTab === tab.key ? '600' : '400',
                color: activeTab === tab.key ? '#2563eb' : '#6b7280',
              } as TextStyle}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'family' ? (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <FamilyPreferencesForm form={familyForm} setForm={setFamilyForm} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Member selector */}
            {members.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingHorizontal: 20, paddingVertical: 12 }}
              >
                {members.map((member, idx) => (
                  <Pressable
                    key={member.userId}
                    onPress={() => setSelectedMemberIdx(idx)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: selectedMemberIdx === idx ? '#2563eb' : '#f3f4f6',
                      borderWidth: 1,
                      borderColor: selectedMemberIdx === idx ? '#2563eb' : '#e5e7eb',
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: selectedMemberIdx === idx ? '#ffffff' : '#374151',
                      } as TextStyle}
                    >
                      {member.displayName}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <View style={{ flex: 1, paddingHorizontal: 20 }}>
              {members.length > 0 && memberForms[selectedMemberIdx] && (
                <MemberOverrideForm
                  member={members[selectedMemberIdx]}
                  form={memberForms[selectedMemberIdx]}
                  setForm={(updater) => {
                    if (typeof updater === 'function') {
                      updateMemberForm(selectedMemberIdx, updater as (prev: MemberFormState) => MemberFormState);
                    }
                  }}
                />
              )}
              {members.length === 0 && (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#9ca3af' } as TextStyle}>
                    No family members to configure.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default PreferenceSettingsScreen;
