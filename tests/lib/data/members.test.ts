import { describe, expect, it, vi } from 'vitest';
import { fetchMemberProfile, fetchMemberRole, fetchMembersByUnit } from '@/lib/data/members';

type SingleResult<T> = { data: T; error: { message: string } | null };

type SingleBuilder<T> = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: () => Promise<SingleResult<T>>;
  getExecutions: () => number;
};

function createSingleBuilder<T>(result: SingleResult<T>): SingleBuilder<T> {
  let executions = 0;

  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(() => {
      executions += 1;
      return Promise.resolve(result);
    }),
    getExecutions: () => executions,
  } satisfies SingleBuilder<T>;

  return builder;
}

type MultiResult<T> = { data: T; error: { message: string } | null };

type MultiBuilder<T> = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  then: (onFulfilled: (value: MultiResult<T>) => unknown) => Promise<unknown>;
  getExecutions: () => number;
};

function createMultiBuilder<T>(result: MultiResult<T>): MultiBuilder<T> {
  let executions = 0;

  const builder: (Partial<Omit<MultiBuilder<T>, 'getExecutions'>> & {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    neq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
  }) & { getExecutions?: () => number } = {
    select: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    neq: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
  };

  (builder as MultiBuilder<T>).then = (onFulfilled) => {
    executions += 1;
    return Promise.resolve(onFulfilled(result));
  };

  (builder as MultiBuilder<T>).getExecutions = () => executions;

  return builder as MultiBuilder<T>;
}

function createProfilesStub<T>(builder: unknown) {
  let fromCalls = 0;

  return {
    from: vi.fn((table: string) => {
      fromCalls += 1;
      expect(table).toBe('profiles');
      return builder;
    }),
    getQueryCount: () => fromCalls,
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
    expect(supabase.getQueryCount()).toBe(1);
    expect(builder.getExecutions()).toBe(1);
  });

  it('throws when supabase returns an error', async () => {
    const builder = createSingleBuilder({ data: null, error: { message: 'role failed' } });
    const supabase = createProfilesStub(builder);

    await expect(fetchMemberRole(supabase as any, 'user-1')).rejects.toThrow(
      /Failed to load member role: role failed/
    );
    expect(supabase.getQueryCount()).toBe(1);
    expect(builder.getExecutions()).toBe(1);
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
    expect(supabase.getQueryCount()).toBe(1);
    expect(builder.getExecutions()).toBe(1);
  });

  it('throws when supabase reports an error', async () => {
    const builder = createSingleBuilder({ data: null, error: { message: 'profile boom' } });
    const supabase = createProfilesStub(builder);

    await expect(fetchMemberProfile(supabase as any, 'user-1')).rejects.toThrow(
      /Failed to load member profile: profile boom/
    );
    expect(supabase.getQueryCount()).toBe(1);
    expect(builder.getExecutions()).toBe(1);
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
    // Guardrail: ensure the unit lookup only performs one PostgREST round-trip.
    expect(supabase.getQueryCount()).toBe(1);
    expect(builder.getExecutions()).toBe(1);
  });

  it('throws when supabase returns an error', async () => {
    const builder = createMultiBuilder({ data: null as any, error: { message: 'unit failed' } });
    const supabase = createProfilesStub(builder);

    await expect(
      fetchMembersByUnit(supabase as any, 'unit-1')
    ).rejects.toThrow(/Failed to load members for unit: unit failed/);
    expect(supabase.getQueryCount()).toBe(1);
    expect(builder.getExecutions()).toBe(1);
  });
});
