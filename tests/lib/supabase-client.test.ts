import { describe, expect, it, beforeEach, vi } from 'vitest'

type CookieStore = {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  delete?: ReturnType<typeof vi.fn>
}

const createServerClientMock = vi.fn(() => ({ mock: 'server-client' }))
const createBrowserClientMock = vi.fn(() => ({ mock: 'browser-client' }))
const cookiesMock = vi.fn()

async function loadModule(cookieStore?: CookieStore) {
  vi.doMock('@supabase/ssr', () => ({
    createServerClient: createServerClientMock,
    createBrowserClient: createBrowserClientMock,
  }))

  vi.doMock('next/headers', () => ({
    cookies: cookiesMock.mockImplementation(() => cookieStore),
  }))

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

  return import('@/lib/supabase-client')
}

describe('createServerClient cookie persistence', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('uses the provided cookie store and persists set/remove operations', async () => {
    const cookieStore = {
      get: vi.fn((name: string) => (name === 'session' ? { value: 'token' } : undefined)),
      set: vi.fn(),
      delete: vi.fn(),
    }

    const module = await loadModule(cookieStore)
    module.createServerClient(cookieStore)

    expect(createServerClientMock).toHaveBeenCalledTimes(1)
    expect(cookiesMock).not.toHaveBeenCalled()

    const options = createServerClientMock.mock.calls[0][2]
    expect(options.cookies.get('session')).toBe('token')

    options.cookies.set('sb', 'value', { path: '/', maxAge: 60 })
    expect(cookieStore.set).toHaveBeenCalledWith({ name: 'sb', value: 'value', path: '/', maxAge: 60 })

    options.cookies.remove('sb', { path: '/' })
    expect(cookieStore.delete).toHaveBeenCalledWith('sb', { path: '/' })
  })

  it('falls back to clearing via set when delete is unavailable', async () => {
    const cookieStore = {
      get: vi.fn(() => undefined),
      set: vi.fn(),
    }

    const module = await loadModule(cookieStore as CookieStore)
    module.createServerClient(cookieStore as CookieStore)

    const options = createServerClientMock.mock.calls[0][2]
    options.cookies.remove('sb-refresh-token', { path: '/', domain: '.example.com' })

    expect(cookieStore.set).toHaveBeenCalledWith({
      name: 'sb-refresh-token',
      value: '',
      path: '/',
      domain: '.example.com',
    })
  })

  it('uses Next.js cookies store when none is provided', async () => {
    const cookieStore = {
      get: vi.fn(() => undefined),
      set: vi.fn(),
      delete: vi.fn(),
    }

    const module = await loadModule(cookieStore)
    module.createServerClient()

    expect(cookiesMock).toHaveBeenCalledTimes(1)
    expect(createServerClientMock).toHaveBeenCalledTimes(1)
  })
})
