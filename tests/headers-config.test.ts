import { describe, expect, it } from 'vitest'

type HeaderRule = {
  source: string
  headers: Array<{ key: string; value: string }>
  has?: Array<{ type: string; key?: string; value?: string }>
}

type ConfigWithHeaders = {
  headers: () => Promise<HeaderRule[]>
}

const loadNextConfig = async (): Promise<ConfigWithHeaders> => {
  const configModule = await import('../next.config.js')
  return (configModule as { default: ConfigWithHeaders }).default
}

describe('Next.js headers configuration', () => {
  it('includes immutable caching for asset pipeline requests', async () => {
    const config = await loadNextConfig()
    const headerRules = await config.headers()

    const assetRule = headerRules.find(rule => rule.source === '/assets/:path*')

    expect(assetRule).toBeDefined()
    expect(assetRule?.headers).toContainEqual({
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable',
    })
  })

  it('applies strict cache control for JSON API fetches', async () => {
    const config = await loadNextConfig()
    const headerRules = await config.headers()

    const apiRule = headerRules.find(rule => rule.source === '/api/:path*')

    expect(apiRule).toBeDefined()
    expect(apiRule?.headers).toContainEqual({
      key: 'Cache-Control',
      value: 'private, max-age=0, must-revalidate',
    })
    expect(apiRule?.has).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'header',
          key: 'accept',
          value: 'application/json',
        }),
      ])
    )
  })
})
