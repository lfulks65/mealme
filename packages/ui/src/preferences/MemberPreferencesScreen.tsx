/**
 * MemberPreferencesScreen — manage member-level preferences
 *
 * Same as FamilyPreferencesScreen but:
 *   - No Budget Range section
 *   - Uses getMemberPreferences / updateMemberPreferences
 *   - Shows member name in header
 *
 * Sections:
 *   - Dietary Restrictions (toggle chips)
 *   - Allergies (toggle chips with severity color coding)
 *   - Cuisine Preferences (three-state: love / like / neutral)
 *   - Save button
 */
import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import {
  DIETARY_RESTRICTIONS,
  DIETARY_RESTRICTION_KEYS,
  ALLERGIES,
  CUISINE_TYPES,
  CUISINE_TYPE_KEYS,
} from '@mealme/shared';
import type { DietaryRestriction, AllergyId, AllergySeverity, CuisineType } from '@mealme/shared';
import { getMemberPreferences, updateMemberPreferences } from '@mealme/api';
import type { MemberPreferencesInput } from '@mealme/api';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface MemberPreferencesScreenProps {
  /** The member ID to manage preferences for. */
  memberId: string;
  /** Display name for the member (shown in header). */
  memberName?: string;
  /** Navigate back. */
  onBack?: () => void;
  /** Container style */
  style?: ViewStyle;
}

// ─── Cuisine preference level ─────────────────────────────────────────────────

type CuisineLevel = 'love' | 'like' | 'neutral';

interface CuisineSelection {
  id: string;
  level: CuisineLevel;
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ─── Dietary Chip ────────────────────────────────────────────────────────────

interface DietaryChipProps {
  icon: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

function DietaryChip({ icon, label, selected, onPress }: DietaryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? '#2563eb' : '#f9fafb',
          borderColor: selected ? '#2563eb' : '#e5e7eb',
        },
      ]}
    >
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={[styles.chipLabel, { color: selected ? '#ffffff' : '#374151' }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Allergy Chip ────────────────────────────────────────────────────────────

interface AllergyChipProps {
  icon: string;
  label: string;
  severity: AllergySeverity;
  selected: boolean;
  onPress: () => void;
}

function AllergyChip({ icon, label, severity, selected, onPress }: AllergyChipProps) {
  const severityColor = severity === 'critical' ? '#dc2626' : '#f59e0b';
  const severityBg = severity === 'critical' ? '#fef2f2' : '#fffbeb';
  const selectedBg = severity === 'critical' ? '#dc2626' : '#d97706';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        styles.allergyChip,
        {
          backgroundColor: selected ? selectedBg : severityBg,
          borderColor: selected ? selectedBg : severity === 'critical' ? '#fecaca' : '#fde68a',
          borderLeftWidth: 3,
          borderLeftColor: selected ? selectedBg : severityColor,
        },
      ]}
    >
      <Text style={styles.chipIcon}>{severity === 'critical' ? '⚠️' : icon}</Text>
      <Text style={[styles.chipLabel, { color: selected ? '#ffffff' : '#374151' }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Three-State Cuisine Chip ────────────────────────────────────────────────

interface CuisineChipProps {
  emoji: string;
  label: string;
  level: CuisineLevel;
  onCycle: () => void;
}

function CuisineChip({ emoji, label, level, onCycle }: CuisineChipProps) {
  const levelConfig: Record<
    CuisineLevel,
    { bg: string; border: string; text: string; indicator: string }
  > = {
    love: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', indicator: '❤️' },
    like: { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb', indicator: '👍' },
    neutral: { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', indicator: '' },
  };

  const config = levelConfig[level];

  return (
    <Pressable
      onPress={onCycle}
      style={[
        styles.chip,
        styles.cuisineChip,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      <Text style={styles.chipIcon}>{emoji}</Text>
      <Text style={[styles.chipLabel, { color: config.text }]}>{label}</Text>
      {config.indicator ? <Text style={styles.cuisineIndicator}>{config.indicator}</Text> : null}
    </Pressable>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MemberPreferencesScreen({
  memberId,
  memberName,
  onBack,
  style,
}: MemberPreferencesScreenProps) {
  // ── Loading & error state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  // ── Form state ─────────────────────────────────────────────────────────
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>([]);
  const [allergies, setAllergies] = useState<AllergyId[]>([]);
  const [cuisineSelections, setCuisineSelections] = useState<CuisineSelection[]>([]);

  // ── Load existing preferences on mount ─────────────────────────────────
  useEffect(() => {
    async function loadPreferences() {
      setLoading(true);
      setError(null);
      try {
        const result = await getMemberPreferences(memberId);
        if (result.preferences) {
          const mp = result.preferences;
          setDietaryRestrictions(mp.dietaryRestrictions as DietaryRestriction[]);
          setAllergies(mp.allergies as AllergyId[]);
          // Convert cuisine preferences to selections (default 'like' for existing)
          setCuisineSelections(
            (mp.cuisinePreferences as CuisineType[]).map((key) => ({
              id: key,
              level: 'like' as CuisineLevel,
            })),
          );
        } else if (result.error && !result.error.includes('not found')) {
          setError(result.error);
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, [memberId]);

  // ── Toggle dietary restriction ───────────────────────────────────────

  const toggleDietary = useCallback((key: DietaryRestriction) => {
    setDietaryRestrictions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  // ── Toggle allergy ───────────────────────────────────────────────────

  const toggleAllergy = useCallback((id: AllergyId) => {
    setAllergies((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }, []);

  // ── Cycle cuisine preference level ────────────────────────────────────

  const cycleCuisine = useCallback((key: CuisineType) => {
    setCuisineSelections((prev) => {
      const existing = prev.find((c) => c.id === key);
      if (!existing) {
        return [...prev, { id: key, level: 'like' }];
      }
      if (existing.level === 'like') {
        return prev.map((c) => (c.id === key ? { ...c, level: 'love' } : c));
      }
      if (existing.level === 'love') {
        return prev.filter((c) => c.id !== key); // Remove → neutral
      }
      return prev;
    });
  }, []);

  // ── Build cuisine preferences array for save ─────────────────────────

  const cuisinePreferences = useMemo<CuisineType[]>(() => {
    return cuisineSelections.filter((c) => c.level !== 'neutral').map((c) => c.id as CuisineType);
  }, [cuisineSelections]);

  // ── Save handler ──────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const input: MemberPreferencesInput = {
        dietaryRestrictions,
        allergies,
        cuisinePreferences,
      };
      const result = await updateMemberPreferences(memberId, input);
      if (result.error) {
        setError(result.error);
        setToast({ message: result.error, variant: 'error' });
      } else {
        setToast({ message: 'Preferences saved successfully!', variant: 'success' });
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to save preferences';
      setError(msg);
      setToast({ message: msg, variant: 'error' });
    } finally {
      setSaving(false);
      // Auto-dismiss toast after 3s
      setTimeout(() => setToast(null), 3000);
    }
  }, [memberId, dietaryRestrictions, allergies, cuisinePreferences]);

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Preferences</Text>
          {memberName && <Text style={styles.headerSubtitle}>{memberName}</Text>}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Toast */}
      {toast && (
        <View
          style={[
            styles.toast,
            toast.variant === 'success' ? styles.toastSuccess : styles.toastError,
          ]}
        >
          <Text
            style={[
              styles.toastText,
              toast.variant === 'success' ? styles.toastSuccessText : styles.toastErrorText,
            ]}
          >
            {toast.message}
          </Text>
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* ── Dietary Restrictions Section ──────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader
            title="Dietary Restrictions"
            subtitle="Personal dietary restrictions (added to family-level)."
          />
          <View style={styles.chipGrid}>
            {DIETARY_RESTRICTION_KEYS.map((key) => {
              const entry = DIETARY_RESTRICTIONS[key];
              return (
                <DietaryChip
                  key={key}
                  icon={entry.icon}
                  label={entry.label}
                  selected={dietaryRestrictions.includes(key)}
                  onPress={() => toggleDietary(key)}
                />
              );
            })}
          </View>
        </View>

        {/* ── Allergies Section ────────────────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader
            title="Allergies"
            subtitle="Personal allergies. Critical allergies are marked in red."
          />
          <View style={styles.chipGrid}>
            {ALLERGIES.map((allergy) => (
              <AllergyChip
                key={allergy.id}
                icon={allergy.icon}
                label={allergy.label}
                severity={allergy.severity}
                selected={allergies.includes(allergy.id)}
                onPress={() => toggleAllergy(allergy.id)}
              />
            ))}
          </View>
        </View>

        {/* ── Cuisine Preferences Section ───────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader
            title="Cuisine Preferences"
            subtitle="Tap to cycle: neutral → Like 👍 → Love ❤️ → neutral"
          />
          <View style={styles.chipGrid}>
            {CUISINE_TYPE_KEYS.map((key) => {
              const entry = CUISINE_TYPES[key];
              const selection = cuisineSelections.find((c) => c.id === key);
              return (
                <CuisineChip
                  key={key}
                  emoji={entry.emoji}
                  label={entry.label}
                  level={selection?.level ?? 'neutral'}
                  onCycle={() => cycleCuisine(key)}
                />
              );
            })}
          </View>
        </View>

        {/* ── Save Button ──────────────────────────────────────────────── */}
        <View style={styles.saveContainer}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            )}
          </Pressable>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  allergyChip: {
    borderLeftWidth: 3,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '500',
  } as TextStyle,
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#f3f4f6',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  chip: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  } as TextStyle,
  container: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  cuisineChip: {
    minWidth: 100,
  },
  cuisineIndicator: {
    fontSize: 12,
    marginLeft: 4,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
  } as TextStyle,
  header: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 50,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  } as TextStyle,
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  } as TextStyle,
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  } as TextStyle,
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  saveContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  } as TextStyle,
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  } as TextStyle,
  toast: {
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  toastErrorText: {
    color: '#991b1b',
  } as TextStyle,
  toastSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  toastSuccessText: {
    color: '#166534',
  } as TextStyle,
  toastText: {
    fontSize: 13,
    fontWeight: '500',
  } as TextStyle,
});

export default MemberPreferencesScreen;
