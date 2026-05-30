/**
 * @module validation
 * General-purpose validation utility functions for MealMe.
 *
 * These helpers validate common input shapes such as emails,
 * non-empty strings, and positive numbers. They are designed
 * to be composable and side-effect free.
 */

import { isValidId } from './id-helpers';
import { isValidDateString } from './date-helpers';

// ---------------------------------------------------------------------------
// String validators
// ---------------------------------------------------------------------------

/**
 * Checks whether a value is a non-empty string (after trimming).
 *
 * @param value - The value to check.
 * @returns `true` if the value is a non-blank string.
 *
 * @example
 * ```ts
 * isNonEmptyString("hello"); // true
 * isNonEmptyString("  ");    // false
 * isNonEmptyString(42);      // false
 * ```
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates an email address format.
 *
 * This uses a practical regex that catches most common formats.
 * It is NOT RFC 5322 complete — for production auth, always
 * verify via a confirmation email.
 *
 * @param value - The value to validate.
 * @returns `true` if the value looks like a valid email.
 *
 * @example
 * ```ts
 * isValidEmail("user@example.com"); // true
 * isValidEmail("not-an-email");     // false
 * ```
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ---------------------------------------------------------------------------
// Number validators
// ---------------------------------------------------------------------------

/**
 * Checks whether a value is a positive number (> 0).
 *
 * @param value - The value to check.
 * @returns `true` if the value is a number greater than zero.
 *
 * @example
 * ```ts
 * isPositiveNumber(5);   // true
 * isPositiveNumber(0);   // false
 * isPositiveNumber(-1);  // false
 * ```
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && Number.isFinite(value);
}

/**
 * Checks whether a value is a non-negative number (>= 0).
 *
 * @param value - The value to check.
 * @returns `true` if the value is a number greater than or equal to zero.
 *
 * @example
 * ```ts
 * isNonNegativeNumber(0);  // true
 * isNonNegativeNumber(5);  // true
 * isNonNegativeNumber(-1); // false
 * ```
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && Number.isFinite(value);
}

/**
 * Checks whether a value is an integer within an inclusive range.
 *
 * @param value - The value to check.
 * @param min - Minimum allowed value (inclusive).
 * @param max - Maximum allowed value (inclusive).
 * @returns `true` if the value is an integer within [min, max].
 *
 * @example
 * ```ts
 * isIntInRange(5, 1, 10);  // true
 * isIntInRange(0, 1, 10);  // false
 * isIntInRange(1.5, 1, 10); // false
 * ```
 */
export function isIntInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

// ---------------------------------------------------------------------------
// Array validators
// ---------------------------------------------------------------------------

/**
 * Checks whether a value is a non-empty array.
 *
 * @param value - The value to check.
 * @returns `true` if the value is an array with at least one element.
 *
 * @example
 * ```ts
   isNonEmptyArray([1, 2]); // true
   isNonEmptyArray([]);     // false
   isNonEmptyArray(null);   // false
 * ```
 */
export function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Checks whether every element in an array satisfies a type guard.
 *
 * @param value - The value to check.
 * @param guard - A type guard function to apply to each element.
 * @returns `true` if the value is an array and every element passes the guard.
 *
 * @example
 * ```ts
 * isArrayOf(["a", "b"], isNonEmptyString); // true
 * isArrayOf(["a", 1], isNonEmptyString);   // false
 * ```
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

// ---------------------------------------------------------------------------
// Composite validators
// ---------------------------------------------------------------------------

/**
 * Validates that an object has a required string property.
 *
 * @param obj - The object to check.
 * @param key - The property name.
 * @returns `true` if `obj[key]` is a non-empty string.
 */
export function hasRequiredString(obj: unknown, key: string): boolean {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    key in obj &&
    isNonEmptyString((obj as Record<string, unknown>)[key])
  );
}

/**
 * Validates that an object has a required ID property (UUID v4).
 *
 * @param obj - The object to check.
 * @param key - The property name (defaults to "id").
 * @returns `true` if `obj[key]` is a valid UUID v4.
 */
export function hasRequiredId(obj: unknown, key = 'id'): boolean {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    key in obj &&
    isValidId((obj as Record<string, unknown>)[key])
  );
}

/**
 * Validates that an object has a required date property (YYYY-MM-DD).
 *
 * @param obj - The object to check.
 * @param key - The property name.
 * @returns `true` if `obj[key]` is a valid ISO-8601 date string.
 */
export function hasRequiredDate(obj: unknown, key: string): boolean {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    key in obj &&
    isValidDateString((obj as Record<string, unknown>)[key])
  );
}
