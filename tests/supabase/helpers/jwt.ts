import jwt, { JwtPayload } from 'jsonwebtoken'

export type SupabaseAppRole = 'tenant' | 'roommate' | 'property_manager' | 'admin'

export interface SupabaseJwtClaims extends JwtPayload {
  sub: string
  aud: string
  role: string
  email?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

export interface SignSupabaseJwtOptions {
  email?: string
  appRole?: SupabaseAppRole
  audience?: string
  expiresIn?: number
  overrides?: Partial<SupabaseJwtClaims>
}

const DEFAULT_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? 'supabase_test_secret'
const DEFAULT_AUDIENCE = 'authenticated'

function basePayload(userId: string, options: SignSupabaseJwtOptions = {}): SupabaseJwtClaims {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresIn = options.expiresIn ?? 60 * 60
  const audience = options.audience ?? DEFAULT_AUDIENCE
  const role = options.overrides?.role ?? 'authenticated'

  return {
    sub: userId,
    aud: audience,
    role,
    email: options.email,
    iat: issuedAt,
    exp: issuedAt + expiresIn,
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      role: options.appRole,
      ...options.overrides?.app_metadata,
    },
    user_metadata: {
      role: options.appRole,
      ...options.overrides?.user_metadata,
    },
    ...options.overrides,
  }
}

export function signServiceRoleJwt(
  userId: string,
  options: SignSupabaseJwtOptions = {},
  secret: string = DEFAULT_JWT_SECRET,
): { token: string; claims: SupabaseJwtClaims } {
  const payload = basePayload(userId, options)
  const token = jwt.sign(payload, secret, { algorithm: 'HS256' })

  const verified = jwt.verify(token, secret)
  if (typeof verified === 'string') {
    throw new Error('Unexpected string payload when verifying Supabase JWT')
  }

  return { token, claims: verified as SupabaseJwtClaims }
}

export function verifyServiceRoleJwt(
  token: string,
  secret: string = DEFAULT_JWT_SECRET,
): SupabaseJwtClaims {
  const verified = jwt.verify(token, secret)
  if (typeof verified === 'string') {
    throw new Error('Unexpected string payload when verifying Supabase JWT')
  }
  return verified as SupabaseJwtClaims
}
