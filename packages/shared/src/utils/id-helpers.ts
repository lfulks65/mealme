/**
 * @module id-helpers
 * ID generation and validation utility functions for MealMe.
 *
 * All IDs in the MealMe system are UUID v4 strings. This module
 * provides helpers for generating, validating, and inspecting IDs.
 */

/**
 * Regular expression pattern for a UUID v4 string.
 *
 * Matches the canonical 8-4-4-4-12 lowercase hex format.
 */
export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generates a random UUID v4 string using the Web Crypto API.
 *
 * Falls back to a Math.random-based implementation if
 * `crypto.randomUUID` is not available.
 *
 * @returns A new UUID v4 string in lowercase.
 *
 * @example
 * ```ts
 * generateId(); // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 * ```
 */
export function generateId(): string {
  // Use the native API when available (Node ≥ 19, modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: conformant UUID v4 via Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Validates whether a value is a well-formed UUID v4 string.
 *
 * @param value - The value to validate.
 * @returns `true` if the value matches the UUID v4 format.
 *
 * @example
 * ```ts
 * isValidId("f47ac10b-58cc-4372-a567-0e02b2c3d479"); // true
 * isValidId("not-a-uuid");                            // false
 * isValidId(123);                                     // false
 * ```
 */
export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value);
}

/**
 * Asserts that a value is a valid UUID v4 string.
 *
 * @param value - The value to assert.
 * @param label - Optional label for the error message (e.g., "userId").
 * @throws {Error} If the value is not a valid UUID v4.
 *
 * @example
 * ```ts
 * assertValidId(userId, "userId");
 * ```
 */
export function assertValidId(value: unknown, label = 'id'): asserts value is string {
  if (!isValidId(value)) {
    throw new Error(
      `Invalid ${label}: expected a UUID v4 string, got ${typeof value === 'string' ? `"${value}"` : String(value)}`,
    );
  }
}

/**
 * Generates multiple unique UUID v4 strings.
 *
 * @param count - Number of IDs to generate.
 * @returns An array of unique UUID v4 strings.
 *
 * @example
 * ```ts
 * generateIds(3); // ["a...", "b...", "c..."]
 * ```
 */
export function generateIds(count: number): string[] {
  return Array.from({ length: count }, () => generateId());
}
