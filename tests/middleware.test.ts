import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { NextRequest } from 'next/server';

import { middleware } from '@/middleware';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from '@supabase/ssr';

const mockedCreateServerClient = createServerClient as unknown as Mock;

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateServerClient.mockReset();
  });

  function mockSupabase(options: { user: { id: string } | null; role?: string | null }) {
    const auth = {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
        error: null,
      }),
    };

    const maybeSingle = vi.fn().mockResolvedValue({
      data: options.role ? { role: options.role } : null,
      error: null,
    });

    const profileBuilder: any = {
      select: vi.fn().mockImplementation(() => profileBuilder),
      eq: vi.fn().mockImplementation(() => profileBuilder),
      maybeSingle,
    };

    const from = vi.fn().mockImplementation((table: string) => {
      expect(table).toBe('profiles');
      return profileBuilder;
    });

    if (!options.user) {
      from.mockImplementation(() => {
        throw new Error('profiles query should not be invoked when user is missing');
      });
    }

    mockedCreateServerClient.mockReturnValue({ auth, from });

    return { auth, from, maybeSingle };
  }

  it('redirects unauthenticated requests targeting the dashboard', async () => {
    mockSupabase({ user: null });

    const request = new NextRequest('https://example.com/dashboard/members');
    const response = await middleware(request);

    expect(response.headers.get('location')).toBe('https://example.com/auth');
  });

  it('allows admins to access the role management dashboard', async () => {
    const { from, maybeSingle } = mockSupabase({ user: { id: 'user-1' }, role: 'admin' });

    const request = new NextRequest('https://example.com/dashboard/roles');
    const response = await middleware(request);

    expect(from).toHaveBeenCalledWith('profiles');
    expect(maybeSingle).toHaveBeenCalled();
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects non-admins away from the role management dashboard', async () => {
    mockSupabase({ user: { id: 'user-2' }, role: 'tenant' });

    const request = new NextRequest('https://example.com/dashboard/roles');
    const response = await middleware(request);

    expect(response.headers.get('location')).toBe('https://example.com/dashboard');
  });
});
