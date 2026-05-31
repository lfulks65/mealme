/**
 * @module preferences/functions.test
 * Unit tests for the preferences CRUD functions.
 *
 * The Supabase client is mocked so these tests run without a
 * real database connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the Supabase client
// ---------------------------------------------------------------------------

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
  updateFamilyPreferences,
  getMemberPreferences,
  updateMemberPreferences,
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

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const FAMILY_ID = 'fam-001';
const MEMBER_ID = 'mem-001';
const USER_ID = 'usr-001';

const familyPrefsRow = {
  id: 'fp-001',
  family_id: FAMILY_ID,
  dietary_restrictions: ['vegetarian'],
  allergies: ['peanuts'],
  cuisine_preferences: ['italian', 'mexican'],
  budget_range: { min: 0, max: 500, currency: 'USD' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const memberPrefsRow = {
  id: 'mp-001',
  member_id: MEMBER_ID,
  dietary_restrictions: ['vegan'],
  allergies: ['soy'],
  cuisine_preferences: ['japanese'],
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
    expect(result.preferences).not.toBeNull();
    expect(result.preferences!.familyId).toBe(FAMILY_ID);
    expect(result.preferences!.dietaryRestrictions).toEqual(['vegetarian']);
    expect(result.preferences!.budgetRange).toEqual({ min: 0, max: 500, currency: 'USD' });
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

// ── updateFamilyPreferences ──────────────────────────────────────────────

describe('updateFamilyPreferences', () => {
  it('upserts family preferences with provided fields', async () => {
    const chain = singleChain(familyPrefsRow);
    mockFrom.mockReturnValue(chain);

    const input = {
      dietaryRestrictions: ['vegan'] as any,
      budgetRange: { min: 0, max: 800, currency: 'USD' },
    };

    const result = await updateFamilyPreferences(FAMILY_ID, input);

    expect(mockFrom).toHaveBeenCalledWith('family_preferences');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: FAMILY_ID,
        dietary_restrictions: ['vegan'],
        budget_range: { min: 0, max: 800, currency: 'USD' },
      }),
      { onConflict: 'family_id' },
    );
    expect(result.preferences).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await updateFamilyPreferences(FAMILY_ID, {});

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });
});

// ── getMemberPreferences ─────────────────────────────────────────────────

describe('getMemberPreferences', () => {
  it('returns member preferences for a given member', async () => {
    const chain = singleChain(memberPrefsRow);
    mockFrom.mockReturnValue(chain);

    const result = await getMemberPreferences(MEMBER_ID);

    expect(mockFrom).toHaveBeenCalledWith('member_preferences');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('member_id', MEMBER_ID);
    expect(result.preferences).not.toBeNull();
    expect(result.preferences!.memberId).toBe(MEMBER_ID);
    expect(result.preferences!.dietaryRestrictions).toEqual(['vegan']);
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getMemberPreferences(MEMBER_ID);

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });
});

// ── updateMemberPreferences ──────────────────────────────────────────────

describe('updateMemberPreferences', () => {
  it('upserts member preferences for the given member', async () => {
    const chain = singleChain(memberPrefsRow);
    mockFrom.mockReturnValue(chain);

    const input = {
      dietaryRestrictions: ['vegan'] as any,
      allergies: ['soy'] as any,
    };

    const result = await updateMemberPreferences(MEMBER_ID, input);

    expect(mockFrom).toHaveBeenCalledWith('member_preferences');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        member_id: MEMBER_ID,
        dietary_restrictions: ['vegan'],
        allergies: ['soy'],
      }),
      { onConflict: 'member_id' },
    );
    expect(result.preferences).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await updateMemberPreferences(MEMBER_ID, {});

    expect(result.preferences).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });
});
