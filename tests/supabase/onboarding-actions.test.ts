import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/supaone", () => ({
  createSupbaseServerClient: vi.fn(),
}));

import { reconcileOnboardingMember } from "@/app/(auth)/onboarding/actions";
import { createSupbaseServerClient } from "@/utils/supaone";

type QueryResponse<T> = { data: T; error: { message: string } | null };

type SupabaseMock = {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

const mockUser: User = {
  id: "user-123",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-05-21T00:00:00Z",
  email: "test@example.com",
  phone: "",
  confirmation_sent_at: "2024-05-21T00:00:00Z",
  confirmed_at: "2024-05-21T00:00:00Z",
  email_confirmed_at: "2024-05-21T00:00:00Z",
  last_sign_in_at: "2024-05-21T00:00:00Z",
  phone_confirmed_at: "2024-05-21T00:00:00Z",
  role: "authenticated",
  identities: [],
  factors: [],
};

const mockSelectChain = (response: QueryResponse<unknown>) => {
  const maybeSingle = vi.fn().mockResolvedValue(response);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });

  return { select, eq, maybeSingle };
};

const mockInsertChain = (response: QueryResponse<unknown>) => {
  const maybeSingle = vi.fn().mockResolvedValue(response);
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const insert = vi.fn().mockReturnValue({ select });

  return { insert, select, maybeSingle };
};

const mockedCreateClient = vi.mocked(createSupbaseServerClient);

const createSupabaseMock = (): SupabaseMock => {
  const authGetUser = vi.fn();
  const from = vi.fn();

  return {
    auth: { getUser: authGetUser },
    from,
  } as SupabaseMock;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reconcileOnboardingMember", () => {
  it("returns null context when no authenticated user is present", async () => {
    const supabase = createSupabaseMock();
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockedCreateClient.mockResolvedValue(supabase as unknown as any);

    const result = await reconcileOnboardingMember();

    expect(result).toEqual({ user: null, member: null });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns the existing member record", async () => {
    const memberRow = {
      id: "member-1",
      user_id: mockUser.id,
      role: null,
      household_id: "house-1",
      created_at: "2024-05-21T00:00:00Z",
    };
    const supabase = createSupabaseMock();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const selectChain = mockSelectChain({
      data: memberRow,
      error: null,
    });
    supabase.from.mockReturnValue(selectChain as unknown as any);
    mockedCreateClient.mockResolvedValue(supabase as unknown as any);

    const result = await reconcileOnboardingMember();

    expect(result.user).toEqual(mockUser);
    expect(result.member).toEqual({
      id: "member-1",
      user_id: mockUser.id,
      role: "tenant",
      household_id: "house-1",
      created_at: "2024-05-21T00:00:00Z",
    });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("creates a member record when none exists", async () => {
    const supabase = createSupabaseMock();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const selectChain = mockSelectChain({
      data: null,
      error: null,
    });
    const insertChain = mockInsertChain({
      data: {
        id: "member-2",
        user_id: mockUser.id,
        role: "tenant",
        household_id: null,
        created_at: "2024-05-22T00:00:00Z",
      },
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(selectChain as unknown as any)
      .mockReturnValueOnce(insertChain as unknown as any);

    mockedCreateClient.mockResolvedValue(supabase as unknown as any);

    const result = await reconcileOnboardingMember();

    expect(result.user).toEqual(mockUser);
    expect(result.member).toEqual({
      id: "member-2",
      user_id: mockUser.id,
      role: "tenant",
      household_id: null,
      created_at: "2024-05-22T00:00:00Z",
    });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("throws when the auth client fails", async () => {
    const supabase = createSupabaseMock();
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "boom" },
    });
    mockedCreateClient.mockResolvedValue(supabase as unknown as any);

    await expect(reconcileOnboardingMember()).rejects.toThrow(
      /Unable to load authenticated user: boom/,
    );
  });

  it("throws when member queries fail", async () => {
    const supabase = createSupabaseMock();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const selectChain = mockSelectChain({
      data: null,
      error: { message: "bad" },
    });

    supabase.from.mockReturnValueOnce(selectChain as unknown as any);
    mockedCreateClient.mockResolvedValue(supabase as unknown as any);

    await expect(reconcileOnboardingMember()).rejects.toThrow(
      /Unable to load member row for user user-123: bad/,
    );
  });
});
