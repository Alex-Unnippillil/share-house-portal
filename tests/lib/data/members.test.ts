import { describe, expect, it, vi } from 'vitest';
import { fetchMemberProfile, fetchMemberRole, fetchMembersByUnit } from '@/lib/data/members';

type SingleResult<T> = { data: T; error: { message: string } | null };

type SingleBuilder<T> = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: () => Promise<SingleResult<T>>;
};

function createSingleBuilder<T>(result: SingleResult<T>): SingleBuilder<T> {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  } as unknown as SingleBuilder<T>;
}

type MultiResult<T> = { data: T; error: { message: string } | null };

type MultiBuilder<T> = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  then: (onFulfilled: (value: MultiResult<T>) => unknown) => Promise<unknown>;
};

function createMultiBuilder<T>(result: MultiResult<T>): MultiBuilder<T> {
  const builder: Partial<MultiBuilder<T>> & {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    neq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    neq: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
  };

  (builder as MultiBuilder<T>).then = (onFulfilled) =>
    Promise.resolve(onFulfilled(result));

  return builder as MultiBuilder<T>;
}

function createProfilesStub<T>(builder: unknown) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('profiles');
      return builder;
    }),
  };
}

describe('fetchMemberRole', () => {
  it('returns the member role when available', async () => {
    const builder = createSingleBuilder({ data: { role: 'tenant' }, error: null });
    const supabase = createProfilesStub(builder);

    const role = await fetchMemberRole(supabase as any, 'user-1');

    expect(builder.select).toHaveBeenCalledWith('role');
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(role).toBe('tenant');
  });

  it('returns null when supabase returns an error', async () => {
    const builder = createSingleBuilder({ data: null, error: { message: 'role failed' } });
    const supabase = createProfilesStub(builder);

    await expect(fetchMemberRole(supabase as any, 'user-error')).resolves.toBeNull();
  });
});

describe('fetchMemberProfile', () => {
  it('returns profile data when present', async () => {
    const profile = {
      id: 'user-1',
      email: 'user@example.com',
      full_name: 'User Example',
      role: 'tenant',
      unit_id: 'unit-1',
    };
    const builder = createSingleBuilder({ data: profile, error: null });
    const supabase = createProfilesStub(builder);

    const result = await fetchMemberProfile(supabase as any, 'user-1');

    expect(builder.select).toHaveBeenCalledWith('id, email, full_name, role, unit_id');
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(result).toEqual(profile);
  });

  it('returns null when supabase reports an error', async () => {
    const builder = createSingleBuilder({ data: null, error: { message: 'profile boom' } });
    const supabase = createProfilesStub(builder);

    await expect(fetchMemberProfile(supabase as any, 'user-1')).resolves.toBeNull();
  });
});

describe('fetchMembersByUnit', () => {
  it('applies filters and returns members', async () => {
    const members = [
      { id: 'user-1', email: '1@example.com', full_name: 'One', role: 'tenant', unit_id: 'unit-1' },
      { id: 'user-2', email: '2@example.com', full_name: 'Two', role: 'roommate', unit_id: 'unit-1' },
    ];
    const builder = createMultiBuilder({ data: members, error: null });
    const supabase = createProfilesStub(builder);

    const result = await fetchMembersByUnit(supabase as any, 'unit-1', {
      excludeUserId: 'user-2',
      roles: ['tenant'],
    });

    expect(builder.select).toHaveBeenCalledWith('id, email, full_name, role, unit_id');
    expect(builder.eq).toHaveBeenCalledWith('unit_id', 'unit-1');
    expect(builder.neq).toHaveBeenCalledWith('id', 'user-2');
    expect(builder.in).toHaveBeenCalledWith('role', ['tenant']);
    expect(result).toEqual(members);
  });

  it('returns an empty list when supabase returns an error', async () => {
    const builder = createMultiBuilder({ data: null as any, error: { message: 'unit failed' } });
    const supabase = createProfilesStub(builder);

    await expect(fetchMembersByUnit(supabase as any, 'unit-1')).resolves.toEqual([]);
  });
});
