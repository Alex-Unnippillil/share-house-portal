import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DYNAMIC,
  DEFAULT_REVALIDATE,
  POLICY_PAGE_REVALIDATE_SECONDS,
  PRODUCT_MARKETING_REVALIDATE_SECONDS,
  STATIC_ROUTES,
  SEMI_STATIC_ROUTES,
  ISR_TAGS,
} from '@/config/isr'

const PROJECT_ROOT = process.cwd()

function readSource(relativePath: string) {
  return readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8')
}

function expectConstExport(source: string, name: string, valueExpression: string) {
  const pattern = new RegExp(`export const ${name}\\s*=\\s*${valueExpression}`)
  expect(source).toMatch(pattern)
}

describe('ISR defaults', () => {
  it('defines global defaults in config', () => {
    expect(DEFAULT_DYNAMIC).toBe('force-dynamic')
    expect(DEFAULT_REVALIDATE).toBe(0)
    expect(POLICY_PAGE_REVALIDATE_SECONDS).toBe(60 * 60 * 24)
    expect(PRODUCT_MARKETING_REVALIDATE_SECONDS).toBe(60 * 60)
    expect(STATIC_ROUTES).toEqual(['/about', '/privacy', '/terms'])
    expect(SEMI_STATIC_ROUTES).toEqual(['/payments', '/messaging', '/maintenance', '/visitors'])
    expect(ISR_TAGS).toMatchObject({
      marketingPolicies: 'marketing:policies',
      productMarketing: 'marketing:product-experience',
    })
  })

  it('applies defaults at the root layout', () => {
    const layoutSource = readSource('app/layout.tsx')
    expectConstExport(layoutSource, 'dynamic', 'DEFAULT_DYNAMIC')
    expectConstExport(layoutSource, 'revalidate', 'DEFAULT_REVALIDATE')
  })
})

describe('static marketing policy routes', () => {
  const staticRoutes = [
    { path: 'app/about/page.tsx', dynamic: 'error', revalidateExpr: 'POLICY_PAGE_REVALIDATE_SECONDS' },
    { path: 'app/privacy/page.mdx', dynamic: 'error', revalidateExpr: 'POLICY_PAGE_REVALIDATE_SECONDS' },
    { path: 'app/terms/page.mdx', dynamic: 'error', revalidateExpr: 'POLICY_PAGE_REVALIDATE_SECONDS' },
  ] as const

  for (const route of staticRoutes) {
    it(`enforces static rendering for ${route.path}`, () => {
      const source = readSource(route.path)
      expectConstExport(source, 'dynamic', `["']${route.dynamic}["']`)
      expectConstExport(source, 'revalidate', route.revalidateExpr)
    })
  }
})

describe('semi-static product marketing routes', () => {
  const semiStaticRoutes = [
    { path: 'app/payments/page.tsx', revalidateExpr: 'PRODUCT_MARKETING_REVALIDATE_SECONDS' },
    { path: 'app/messaging/page.tsx', revalidateExpr: 'PRODUCT_MARKETING_REVALIDATE_SECONDS' },
    { path: 'app/maintenance/page.tsx', revalidateExpr: 'PRODUCT_MARKETING_REVALIDATE_SECONDS' },
    { path: 'app/visitors/page.tsx', revalidateExpr: 'PRODUCT_MARKETING_REVALIDATE_SECONDS' },
  ] as const

  for (const route of semiStaticRoutes) {
    it(`uses ISR for ${route.path}`, () => {
      const source = readSource(route.path)
      expectConstExport(source, 'dynamic', `["']force-static["']`)
      expectConstExport(source, 'revalidate', route.revalidateExpr)
    })
  }
})
