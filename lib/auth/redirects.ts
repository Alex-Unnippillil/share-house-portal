const DEFAULT_REDIRECT_PATH = "/"
const ALLOWED_REDIRECT_PATH_PREFIXES = [
  "/",
  "/about",
  "/account",
  "/auth",
  "/bookings",
  "/chores",
  "/confirmation",
  "/contact",
  "/countries",
  "/dashboard",
  "/documents",
  "/error",
  "/maintenance",
  "/messaging",
  "/onboarding",
  "/payments",
  "/perf",
  "/privacy",
  "/private",
  "/schedule",
  "/signout",
  "/ssrcountries",
  "/supplies",
  "/terms",
  "/visitors",
] as const

type RequestLike = Pick<Request, "headers" | "url">

const trustedRedirectOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.AUTH_REDIRECT_BASE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
]
  .filter((value): value is string => Boolean(value))
  .map((value) => {
    try {
      return new URL(value).origin
    } catch {
      return null
    }
  })
  .filter((value): value is string => Boolean(value))

function isAllowedPathname(pathname: string) {
  if (pathname === DEFAULT_REDIRECT_PATH) {
    return true
  }

  return ALLOWED_REDIRECT_PATH_PREFIXES.some((prefix) => {
    if (prefix === DEFAULT_REDIRECT_PATH) {
      return pathname === DEFAULT_REDIRECT_PATH
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}

function stripFragment(path: string) {
  const fragmentIndex = path.indexOf("#")
  if (fragmentIndex === -1) {
    return path
  }

  return path.slice(0, fragmentIndex)
}

export function sanitizeNextPath(rawNext: string | null | undefined) {
  if (!rawNext) {
    return DEFAULT_REDIRECT_PATH
  }

  const withoutFragment = stripFragment(rawNext.trim())

  if (!withoutFragment.startsWith("/")) {
    return DEFAULT_REDIRECT_PATH
  }

  if (withoutFragment.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH
  }

  if (withoutFragment.includes("\\")) {
    return DEFAULT_REDIRECT_PATH
  }

  const [pathname, search = ""] = withoutFragment.split("?")

  if (!pathname) {
    return DEFAULT_REDIRECT_PATH
  }

  const hasDirectoryTraversal = pathname.split("/").some((segment) => segment === "..")

  if (hasDirectoryTraversal) {
    return DEFAULT_REDIRECT_PATH
  }

  try {
    const decodedPathname = decodeURIComponent(pathname)
    const hasEncodedTraversal = decodedPathname
      .split("/")
      .some((segment) => segment === "..")

    if (hasEncodedTraversal) {
      return DEFAULT_REDIRECT_PATH
    }

    if (!decodedPathname.startsWith("/")) {
      return DEFAULT_REDIRECT_PATH
    }

    if (decodedPathname.startsWith("//")) {
      return DEFAULT_REDIRECT_PATH
    }
  } catch {
    return DEFAULT_REDIRECT_PATH
  }

  if (!isAllowedPathname(pathname)) {
    return DEFAULT_REDIRECT_PATH
  }

  return search ? `${pathname}?${search}` : pathname
}

function getForwardedOrigin(request: RequestLike, fallbackProtocol: string) {
  const forwardedHost = request.headers.get("x-forwarded-host")
  if (!forwardedHost) {
    return null
  }

  const forwardedProto = request.headers.get("x-forwarded-proto") ?? fallbackProtocol
  try {
    return new URL(`${forwardedProto}://${forwardedHost}`).origin
  } catch {
    return null
  }
}

export function getTrustedRedirectBase(request: RequestLike) {
  const requestUrl = new URL(request.url)
  const fallbackProtocol = requestUrl.protocol.replace(":", "") || "https"
  const configuredOrigins = new Set(trustedRedirectOrigins)

  if (configuredOrigins.size === 0) {
    return requestUrl.origin
  }

  if (configuredOrigins.has(requestUrl.origin)) {
    return requestUrl.origin
  }

  const forwardedOrigin = getForwardedOrigin(request, fallbackProtocol)
  if (forwardedOrigin && configuredOrigins.has(forwardedOrigin)) {
    return forwardedOrigin
  }

  const [firstOrigin] = configuredOrigins
  return firstOrigin ?? requestUrl.origin
}

export { DEFAULT_REDIRECT_PATH }
