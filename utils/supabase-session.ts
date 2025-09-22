import { cookies } from "next/headers";

interface RawSupabaseSession {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number | string | null;
  expires_in?: number;
  user?: Record<string, unknown> | null;
  currentSession?: RawSupabaseSession;
  session?: RawSupabaseSession;
  current_token?: string;
  expiresAt?: number | string | null;
}

export interface SupabaseCookieSession {
  access_token: string;
  refresh_token?: string;
  expires_at: number | null;
  user: Record<string, unknown> | null;
}

function getProjectRef(supabaseUrl?: string): string | null {
  if (!supabaseUrl) {
    return null;
  }

  try {
    const { host } = new URL(supabaseUrl);
    const [projectRef] = host.split(".");

    return projectRef || null;
  } catch (error) {
    return null;
  }
}

export function getSupabaseAuthCookieName(supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  const projectRef = getProjectRef(supabaseUrl);

  if (!projectRef) {
    return null;
  }

  return `sb-${projectRef}-auth-token`;
}

function coerceNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseSessionPayload(payload: RawSupabaseSession | null | undefined): SupabaseCookieSession | null {
  if (!payload) {
    return null;
  }

  const candidate = payload.currentSession || payload.session || payload;
  const accessToken =
    candidate.access_token ||
    candidate.current_token ||
    payload.access_token ||
    payload.current_token;

  if (!accessToken) {
    return null;
  }

  const refreshToken = candidate.refresh_token || payload.refresh_token;

  const expiresSource =
    candidate.expires_at ??
    payload.expires_at ??
    candidate.expiresAt ??
    payload.expiresAt ??
    (typeof candidate.expires_in === "number" ? Math.floor(Date.now() / 1000) + candidate.expires_in : null);

  const expires_at = coerceNumber(expiresSource);

  const user = (candidate.user ?? payload.user) ?? null;

  return {
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
    expires_at,
    user,
  };
}

export function parseSupabaseSessionCookie(value: string | undefined): SupabaseCookieSession | null {
  if (!value) {
    return null;
  }

  let decoded = value;

  try {
    decoded = decodeURIComponent(value);
  } catch (error) {
    // Ignore decode failures – fall back to raw value.
  }

  try {
    const payload = JSON.parse(decoded) as RawSupabaseSession;

    return normaliseSessionPayload(payload);
  } catch (error) {
    return null;
  }
}

export function readSupabaseSessionFromCookie(): SupabaseCookieSession | null {
  const cookieName = getSupabaseAuthCookieName();

  if (!cookieName) {
    return null;
  }

  const cookieValue = cookies().get(cookieName)?.value;
  const session = parseSupabaseSessionCookie(cookieValue);

  if (!session) {
    return null;
  }

  if (session.expires_at) {
    const now = Math.floor(Date.now() / 1000);

    if (session.expires_at <= now) {
      return null;
    }
  }

  return session;
}
