const parseOrigin = (value?: string | null) => {
  if (!value) {
    return undefined
  }

  try {
    return new URL(value).origin
  } catch (error) {
    console.warn(`[siteConfig] Failed to parse origin from "${value}":`, error)
    return undefined
  }
}

const uniqueOrigins = (...origins: Array<string | undefined>) => {
  return Array.from(new Set(origins.filter(Boolean) as string[]))
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const documensoBaseUrl =
  process.env.DOCUMENSO_BASE_URL ?? 'https://app.documenso.com'
const calcomApiBaseUrl = process.env.CALCOM_BASE_URL ?? 'https://api.cal.com'
const calcomEmbedBaseUrl =
  process.env.CALCOM_EMBED_URL ?? 'https://app.cal.com'

export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: 'Roomsily',
  description:
    'www.roomsily is the modern co-living HQ for effortless rent, amenities, and roommate communication.',
  mainNav: [
    {
      title: 'Home',
      href: '/',
    },
    {
      title: 'Dashboard',
      href: '/dashboard',
    },
    {
      title: 'Payments',
      href: '/payments',
    },
    {
      title: 'Documents',
      href: '/documents',
    },
    {
      title: 'Messaging',
      href: '/messaging',
    },
    {
      title: 'Visitors',
      href: '/visitors',
    },
    {
      title: 'Maintenance',
      href: '/maintenance',
    },
    {
      title: 'Account',
      href: '/account',
    },
    {
      title: 'Contact',
      href: '/contact',
    },
  ],
  links: {
    login: '/auth',
    signup: '/onboarding',
    contact: '/contact',
  },
  thirdParty: {
    supabase: {
      baseUrl: supabaseUrl,
      origins: uniqueOrigins(parseOrigin(supabaseUrl)),
      routes: [
        '/account',
        '/countries',
        '/dashboard',
        '/documents',
        '/maintenance',
        '/ssrcountries',
        '/visitors',
      ],
    },
    stripe: {
      origins: uniqueOrigins(
        'https://checkout.stripe.com',
        'https://billing.stripe.com'
      ),
      routes: ['/payments'],
    },
    documenso: {
      baseUrl: documensoBaseUrl,
      origins: uniqueOrigins(parseOrigin(documensoBaseUrl)),
      routes: ['/documents'],
    },
    calcom: {
      baseUrl: calcomApiBaseUrl,
      origins: uniqueOrigins(
        parseOrigin(calcomEmbedBaseUrl),
        parseOrigin(calcomApiBaseUrl)
      ),
      routes: ['/bookings'],
    },
  },
} as const
