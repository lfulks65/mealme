/**
 * @module preferences
 * Preference management screens and context for MealMe.
 *
 * Exports:
 *   - FamilyPreferencesScreen — family-level preference editing
 *   - MemberPreferencesScreen — member-level preference editing
 *   - PreferencesContext / PreferencesProvider / usePreferencesContext
 */

export { FamilyPreferencesScreen } from './FamilyPreferencesScreen';
export type { FamilyPreferencesScreenProps } from './FamilyPreferencesScreen';

export { MemberPreferencesScreen } from './MemberPreferencesScreen';
export type { MemberPreferencesScreenProps } from './MemberPreferencesScreen';

export { PreferencesProvider, usePreferencesContext } from './PreferencesContext';
export type { PreferencesContextValue, PreferencesProviderProps } from './PreferencesContext';

// Re-export the default context for advanced usage
export { default as PreferencesContext } from './PreferencesContext';
