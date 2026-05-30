/**
 * @module date-helpers
 * Date utility functions for MealMe.
 *
 * All functions are pure and side-effect free. They operate on
 * ISO-8601 date strings (YYYY-MM-DD) or Date objects and return
 * standardized string representations.
 */

/**
 * Returns today's date as an ISO-8601 date string (YYYY-MM-DD).
 *
 * @example
 * ```ts
 * getToday(); // "2025-01-15"
 * ```
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * Formats a Date object as an ISO-8601 date string (YYYY-MM-DD).
 *
 * @param date - The Date object to format.
 * @returns The date in YYYY-MM-DD format.
 *
 * @example
 * ```ts
 * formatDate(new Date(2025, 0, 15)); // "2025-01-15"
 * ```
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses an ISO-8601 date string (YYYY-MM-DD) into a Date object.
 *
 * The resulting Date is set to midnight UTC to avoid timezone issues.
 *
 * @param dateStr - The date string in YYYY-MM-DD format.
 * @returns A Date object representing the start of that day (UTC).
 * @throws {Error} If the date string is not a valid YYYY-MM-DD format.
 *
 * @example
 * ```ts
 * parseDate("2025-01-15"); // Date(2025-01-15T00:00:00.000Z)
 * ```
 */
export function parseDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // JS months are 0-indexed
  const day = Number(dayStr);

  // Validate the date actually exists
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date: "${dateStr}". The date does not exist.`);
  }

  return date;
}

/**
 * Adds a specified number of days to a date string.
 *
 * @param dateStr - The starting date in YYYY-MM-DD format.
 * @param days - Number of days to add (negative to subtract).
 * @returns The resulting date in YYYY-MM-DD format.
 *
 * @example
 * ```ts
 * addDays("2025-01-15", 7);  // "2025-01-22"
 * addDays("2025-01-15", -1); // "2025-01-14"
 * ```
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

/**
 * Returns the number of days between two date strings.
 *
 * The result is positive if `endStr` is after `startStr`,
 * negative if before, and zero if the same day.
 *
 * @param startStr - The start date in YYYY-MM-DD format.
 * @param endStr - The end date in YYYY-MM-DD format.
 * @returns The number of days between the two dates.
 *
 * @example
 * ```ts
 * daysBetween("2025-01-15", "2025-01-22"); // 7
 * daysBetween("2025-01-22", "2025-01-15"); // -7
 * ```
 */
export function daysBetween(startStr: string, endStr: string): number {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const msPerDay = 86_400_000; // 24 * 60 * 60 * 1000
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Returns the ISO day of the week (1 = Monday, 7 = Sunday)
 * for the given date string, following ISO 8601.
 *
 * @param dateStr - The date in YYYY-MM-DD format.
 * @returns ISO weekday number (1–7).
 *
 * @example
 * ```ts
 * getIsoWeekday("2025-01-13"); // 1 (Monday)
 * getIsoWeekday("2025-01-19"); // 7 (Sunday)
 * ```
 */
export function getIsoWeekday(dateStr: string): number {
  const date = parseDate(dateStr);
  const jsDay = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Returns the date string for the Monday of the week
 * containing the given date.
 *
 * @param dateStr - Any date in YYYY-MM-DD format.
 * @returns The Monday of that week in YYYY-MM-DD format.
 *
 * @example
 * ```ts
 * getWeekStart("2025-01-15"); // "2025-01-13" (Wednesday → Monday)
 * getWeekStart("2025-01-13"); // "2025-01-13" (already Monday)
 * ```
 */
export function getWeekStart(dateStr: string): string {
  const isoDay = getIsoWeekday(dateStr);
  return addDays(dateStr, 1 - isoDay);
}

/**
 * Returns the date string for the Sunday of the week
 * containing the given date.
 *
 * @param dateStr - Any date in YYYY-MM-DD format.
 * @returns The Sunday of that week in YYYY-MM-DD format.
 *
 * @example
 * ```ts
 * getWeekEnd("2025-01-15"); // "2025-01-19" (Wednesday → Sunday)
 * ```
 */
export function getWeekEnd(dateStr: string): string {
  const isoDay = getIsoWeekday(dateStr);
  return addDays(dateStr, 7 - isoDay);
}

/**
 * Generates an array of date strings for a range (inclusive).
 *
 * @param startStr - The start date in YYYY-MM-DD format.
 * @param endStr - The end date in YYYY-MM-DD format.
 * @returns Array of date strings from start to end, inclusive.
 *
 * @example
 * ```ts
 * getDateRange("2025-01-15", "2025-01-17");
 * // ["2025-01-15", "2025-01-16", "2025-01-17"]
 * ```
 */
export function getDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  let current = startStr;
  const totalDays = daysBetween(startStr, endStr);

  for (let i = 0; i <= totalDays; i++) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * Checks whether a string is a valid ISO-8601 date (YYYY-MM-DD).
 *
 * @param value - The value to check.
 * @returns `true` if the value is a valid date string, `false` otherwise.
 *
 * @example
 * ```ts
 * isValidDateString("2025-01-15"); // true
 * isValidDateString("2025-13-01"); // false
 * isValidDateString("not-a-date"); // false
 * ```
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    parseDate(value);
    return true;
  } catch {
    return false;
  }
}
