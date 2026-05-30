/**
 * Preferences — preference UI components for MealMe
 *
 * Provides onboarding wizard, settings screen, and summary card
 * for managing family and member preferences.
 */

export { PreferenceOnboardingScreen } from './PreferenceOnboardingScreen';
export type { OnboardingPreferences, PreferenceOnboardingScreenProps } from './PreferenceOnboardingScreen';

export { PreferenceSettingsScreen } from './PreferenceSettingsScreen';
export type { MemberWithPreferences, PreferenceSettingsScreenProps } from './PreferenceSettingsScreen';

export { PreferenceSummaryCard } from './PreferenceSummaryCard';
export type { PreferenceSummaryCardProps } from './PreferenceSummaryCard';

export { usePreferences } from './usePreferences';
export type { UsePreferencesConfig, UsePreferencesResult } from './usePreferences';
