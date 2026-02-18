import governance from "@/config/route-governance.json"

const {
  productionPublicExact,
  productionPublicPrefixes,
  productionAuthenticatedPrefixes,
  internalToolingPrefixes,
  demoArtifactPrefixes,
} = governance

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isGovernedPublicRoute(pathname: string): boolean {
  if (productionPublicExact.includes(pathname)) {
    return true
  }

  return productionPublicPrefixes.some((prefix) => matchesPrefix(pathname, prefix))
}

export function isGovernedAuthenticatedRoute(pathname: string): boolean {
  return productionAuthenticatedPrefixes.some((prefix) => matchesPrefix(pathname, prefix))
}

export function isInternalToolingRoute(pathname: string): boolean {
  return internalToolingPrefixes.some((prefix) => matchesPrefix(pathname, prefix))
}

export function isDemoArtifactRoute(pathname: string): boolean {
  return demoArtifactPrefixes.some((prefix) => matchesPrefix(pathname, prefix))
}

export function isInternalRoutesEnabled(): boolean {
  return process.env.ENABLE_INTERNAL_ROUTES === "true"
}

export const ROUTE_GOVERNANCE = governance
