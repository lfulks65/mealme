/**
 * @module preferences/functions.test
 * Unit tests for the preferences CRUD and aggregation functions.
 *
 * The Supabase client is mocked so these tests run without a
 * real database connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the Supabase client
// ---------------------------------------------------------------------------

// We need to mock the supabase module before importing the functions
const mockAuthGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockAuthGetUser(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocking
// ---------------------------------------------------------------------------

import {
  getFamilyPreferences,
  upsertFamilyPreferences,
  getMemberPreferences,
  upsertMemberPreferences,
  getAggregatedPreferences,
} from './functions';

// ---------------------------------------------------------------------------
// Helpers to build chainable Supabase query mocks
// ---------------------------------------------------------------------------

/** Build a chainable mock where the final `.single()` resolves to the given value. */
function singleChain(data: any, error: any = null) {
  const c: any = {};
  c.select = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockReturnValue(c);
  c.upsert = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data, error });
  return c;
}

/** Build a chainable mock where the final query resolves to an array. */
function arrayChain(data: any[], error: any = null) {
  const c: any = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockResolvedValue({ data, error });
  return c;
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const FAMILY_ID = 'fam-001';
const USER_ID = 'usr-001';
const OTHER_USER_ID = 'usr-002';

const familyPrefsRow = {
  id: 'fp-001',
  family_id: FAMILY_ID,
  dietary_restrictions: ['vegetarian'],
  allergies: ['peanuts'],
  cuisine_preferences: ['italian', 'mexican'],
  budget_tier: 'moderate',
  household_size: 4,
  notes: 'Like spicy food',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const memberPrefsRow = {
  id: 'mp-001',
  family_id: FAMILY_ID,
  user_id: USER_ID,
  dietary_restrictions: ['vegan'],
  allergies: ['soy'],
  cuisine_preferences: ['japanese'],
  is_override: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const memberPrefsRow2 = {
  id: 'mp-002',
  family_id: FAMILY_ID,
  user_id: OTHER_USER_ID,
  dietary_restrictions: ['glutenFree'],
  allergies: ['dairy'],
  cuisine_preferences: ['indian'],
  is_override: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const memberPrefsRowNoOverride = {
  id: 'mp-003',
  family_id: FAMILY_ID,
  user_id: 'usr-003',
  dietary_restrictions: ['keto'],
  allergies: ['shellfish'],
  cuisine_preferences: ['american'],
  is_override: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthGetUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
  });
});

// ── getFamilyPreferences ──────────────────────────────────────────────────

describe('getFamilyPreferences', () => {
  it('returns family preferences for a given family', async () => {
    const chain = singleChain(familyPrefsRow);
    mockFrom.mockReturnValue(chain);

    const result = await getFamilyPreferences(FAMILY_ID);

    expect(mockFrom).toHaveBeenCalledWith('family_preferences');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('family_id', FAMILY_ID);
    expect(result.preferences).toEqual(familyPrefsRow);
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getFamilyPreferences(FAMILY_ID);

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when Supabase query fails', async () => {
    const chain = singleChain(null, { message: 'Not found' });
    mockFrom.mockReturnValue(chain);

    const result = await getFamilyPreferences(FAMILY_ID);

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not found');
  });
});

// ── upsertFamilyPreferences ──────────────────────────────────────────────

describe('upsertFamilyPreferences', () => {
  it('upserts family preferences with provided fields', async () => {
    const chain = singleChain(familyPrefsRow);
    mockFrom.mockReturnValue(chain);

    const input = {
      dietaryRestrictions: ['vegan'] as any,
      budgetTier: 'premium' as any,
    };

    const result = await upsertFamilyPreferences(FAMILY_ID, input);

    expect(mockFrom).toHaveBeenCalledWith('family_preferences');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: FAMILY_ID,
        dietary_restrictions: ['vegan'],
        budget_tier: 'premium',
      }),
      { onConflict: 'family_id' },
    );
    expect(result.preferences).toEqual(familyPrefsRow);
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await upsertFamilyPreferences(FAMILY_ID, {});

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });
});

// ── getMemberPreferences ─────────────────────────────────────────────────

describe('getMemberPreferences', () => {
  it('returns member preferences for a given family and user', async () => {
    const chain = singleChain(memberPrefsRow);
    mockFrom.mockReturnValue(chain);

    const result = await getMemberPreferences(FAMILY_ID, USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('member_preferences');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('family_id', FAMILY_ID);
    expect(chain.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(result.preferences).toEqual(memberPrefsRow);
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getMemberPreferences(FAMILY_ID, USER_ID);

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });
});

// ── upsertMemberPreferences ──────────────────────────────────────────────

describe('upsertMemberPreferences', () => {
  it('upserts member preferences for the current user', async () => {
    const chain = singleChain(memberPrefsRow);
    mockFrom.mockReturnValue(chain);

    const input = {
      dietaryRestrictions: ['vegan'] as any,
      isOverride: true,
    };

    const result = await upsertMemberPreferences(FAMILY_ID, USER_ID, input);

    expect(mockFrom).toHaveBeenCalledWith('member_preferences');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: FAMILY_ID,
        user_id: USER_ID,
        dietary_restrictions: ['vegan'],
        is_override: true,
      }),
      { onConflict: 'family_id,user_id' },
    );
    expect(result.preferences).toEqual(memberPrefsRow);
    expect(result.error).toBeNull();
  });

  it('rejects upsert for a different user', async () => {
    const result = await upsertMemberPreferences(FAMILY_ID, OTHER_USER_ID, {});

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('You can only update your own preferences');
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await upsertMemberPreferences(FAMILY_ID, USER_ID, {});

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });
});

// ── getAggregatedPreferences ─────────────────────────────────────────────

describe('getAggregatedPreferences', () => {
  it('merges family defaults with member overrides', async () => {
    // First call: family_preferences
    const familyChain = singleChain(familyPrefsRow);
    // Second call: member_preferences (array)
    const memberChain = arrayChain([memberPrefsRow, memberPrefsRow2, memberPrefsRowNoOverride]);

    mockFrom
      .mockReturnValueOnce(familyChain)
      .mockReturnValueOnce(memberChain);

    const result = await getAggregatedPreferences(FAMILY_ID);

    expect(result.error).toBeNull();
    expect(result.preferences).not.toBeNull();

    const prefs = result.preferences!;

    // Dietary restrictions: family ['vegetarian'] + override member1 ['vegan'] + override member2 ['glutenFree']
    // Non-override member3 ['keto'] should NOT be included
    expect(prefs.dietaryRestrictions).toEqual(['vegetarian', 'vegan', 'glutenFree']);

    // Allergies: family ['peanuts'] + member1 ['soy'] + member2 ['dairy']
    expect(prefs.allergies).toEqual(['peanuts', 'soy', 'dairy']);

    // Cuisine preferences: family ['italian', 'mexican'] + member1 ['japanese'] + member2 ['indian']
    expect(prefs.cuisinePreferences).toEqual(['italian', 'mexican', 'japanese', 'indian']);

    // Family-only fields
    expect(prefs.budgetTier).toBe('moderate');
    expect(prefs.householdSize).toBe(4);
    expect(prefs.notes).toBe('Like spicy food');

    // Only override members listed
    expect(prefs.memberOverrides).toHaveLength(2);
    expect(prefs.memberOverrides.map((m) => m.user_id)).toEqual([USER_ID, OTHER_USER_ID]);
  });

  it('returns family defaults when no member overrides exist', async () => {
    const familyChain = singleChain(familyPrefsRow);
    const memberChain = arrayChain([memberPrefsRowNoOverride]);

    mockFrom
      .mockReturnValueOnce(familyChain)
      .mockReturnValueOnce(memberChain);

    const result = await getAggregatedPreferences(FAMILY_ID);

    expect(result.error).toBeNull();
    const prefs = result.preferences!;

    expect(prefs.dietaryRestrictions).toEqual(['vegetarian']);
    expect(prefs.allergies).toEqual(['peanuts']);
    expect(prefs.cuisinePreferences).toEqual(['italian', 'mexican']);
    expect(prefs.memberOverrides).toHaveLength(0);
  });

  it('returns family defaults when no member preferences exist at all', async () => {
    const familyChain = singleChain(familyPrefsRow);
    const memberChain = arrayChain([]);

    mockFrom
      .mockReturnValueOnce(familyChain)
      .mockReturnValueOnce(memberChain);

    const result = await getAggregatedPreferences(FAMILY_ID);

    expect(result.error).toBeNull();
    const prefs = result.preferences!;

    expect(prefs.dietaryRestrictions).toEqual(['vegetarian']);
    expect(prefs.allergies).toEqual(['peanuts']);
    expect(prefs.cuisinePreferences).toEqual(['italian', 'mexican']);
    expect(prefs.memberOverrides).toHaveLength(0);
  });

  it('deduplicates overlapping values between family and members', async () => {
    const familyWithOverlap = {
      ...familyPrefsRow,
      dietary_restrictions: ['vegetarian', 'vegan'],
      allergies: ['peanuts', 'soy'],
      cuisine_preferences: ['italian', 'japanese'],
    };

    const memberWithOverlap = {
      ...memberPrefsRow,
      dietary_restrictions: ['vegan'],
      allergies: ['soy'],
      cuisine_preferences: ['japanese'],
      is_override: true,
    };

    const familyChain = singleChain(familyWithOverlap);
    const memberChain = arrayChain([memberWithOverlap]);

    mockFrom
      .mockReturnValueOnce(familyChain)
      .mockReturnValueOnce(memberChain);

    const result = await getAggregatedPreferences(FAMILY_ID);

    expect(result.error).toBeNull();
    const prefs = result.preferences!;

    // Deduplicated
    expect(prefs.dietaryRestrictions).toEqual(['vegetarian', 'vegan']);
    expect(prefs.allergies).toEqual(['peanuts', 'soy']);
    expect(prefs.cuisinePreferences).toEqual(['italian', 'japanese']);
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getAggregatedPreferences(FAMILY_ID);

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when family preferences not found', async () => {
    const familyChain = singleChain(null, { message: 'Not found' });
    mockFrom.mockReturnValueOnce(familyChain);

    const result = await getAggregatedPreferences(FAMILY_ID);

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not found');
  });

  it('returns error when member preferences query fails', async () => {
    const familyChain = singleChain(familyPrefsRow);
    const memberChain = arrayChain(null as any, { message: 'DB error' });

    mockFrom
      .mockReturnValueOnce(familyChain)
      .mockReturnValueOnce(memberChain);

    const result = await getAggregatedPreferences(FAMILY_ID);

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('DB error');
  });
});
