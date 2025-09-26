import { cookies as nextCookies } from "next/headers"
import { createHmac, randomBytes, timingSafeEqual } from "crypto"

type CookieStore = ReturnType<typeof nextCookies>

export const CSRF_COOKIE_NAME = "csrf_token"

function getSecret() {
  return process.env.CSRF_SECRET || "development-csrf-secret"
}

function signToken(token: string) {
  return createHmac("sha256", getSecret()).update(token).digest("hex")
}

function hasValidSignature(token: string, signature: string) {
  const expectedSignature = signToken(token)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer)
}

function tokensMatch(a: string, b: string) {
  const tokenBuffer = Buffer.from(a)
  const otherBuffer = Buffer.from(b)

  if (tokenBuffer.length !== otherBuffer.length) {
    return false
  }

  return timingSafeEqual(tokenBuffer, otherBuffer)
}

export function createSignedCsrfCookieValue(token: string) {
  return `${token}.${signToken(token)}`
}

export function ensureCsrfToken(cookieStore: CookieStore) {
  const existingValue = cookieStore.get(CSRF_COOKIE_NAME)?.value

  if (existingValue) {
    const [token, signature] = existingValue.split(".")

    if (token && signature && hasValidSignature(token, signature)) {
      return token
    }
  }

  const token = randomBytes(32).toString("hex")

  cookieStore.set({
    name: CSRF_COOKIE_NAME,
    value: createSignedCsrfCookieValue(token),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  return token
}

export function verifyCsrfToken(
  cookieStore: CookieStore,
  tokenFromForm: string | undefined | null,
) {
  if (!tokenFromForm) {
    return false
  }

  const storedValue = cookieStore.get(CSRF_COOKIE_NAME)?.value

  if (!storedValue) {
    return false
  }

  const [storedToken, storedSignature] = storedValue.split(".")

  if (!storedToken || !storedSignature) {
    return false
  }

  if (!hasValidSignature(storedToken, storedSignature)) {
    return false
  }

  return tokensMatch(storedToken, tokenFromForm)
}
