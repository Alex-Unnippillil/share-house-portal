import type { Metadata, Viewport } from "next"

import { siteConfig } from "@/config/site"

const FALLBACK_APP_URL = "https://www.roomsily"

function resolveMetadataBaseUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!configuredUrl) {
    return new URL(FALLBACK_APP_URL)
  }

  const normalizedUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`

  try {
    return new URL(normalizedUrl)
  } catch {
    return new URL(FALLBACK_APP_URL)
  }
}

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: "/manifest.json",
  metadataBase: resolveMetadataBaseUrl(),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en-US",
      "de-DE": "/de-DE",
      "es-ES": "/es-ES",
      "fr-FR": "/fr-FR",
      "ja-JP": "/ja-JP",
      "ko-KR": "/ko-KR",
      "zh-CN": "/zh-CN",
      "pt-PT": "/pt-PT",
    },
  },
  referrer: "origin-when-cross-origin",
  keywords: [
    "Roomsily",
    "NextJS 14 TypeScript",
    "Supabase SSR",
    "TanStack React Query",
    "co-living software",
    "rent payment portal",
    "shadcn/ui",
    "Tailwind CSS",
    "SaaS",
    "NextJS Supabase Postgres Tailwind TanStack",
    "NextJS CSP",
    "PWA",
    "NextJS SaaS PWA Template",
    "CRUD ops",
    "secure headers",
    "NextJS templates with user authentication, RBAC, and CRUD ops",
    "NextJS templates with data validation and database integration",
    "Rust API runtime for vercel serverless functions",
    "NextJS secure headers",
    "NextJS NextMDX",
  ],
  authors: [{ name: "Robert Mourey Jr" }],
  creator: "Robert Mourey Jr",
  publisher: "Robert Mourey Jr",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  generator: "NextJS",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    url: "https://www.roomsily",
    images: [
      {
        url: "/roomsily-og.svg",
        width: 1200,
        height: 630,
        alt: "Roomsily — modern co-living hub",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    title: siteConfig.name,
    description: siteConfig.description,
    site: "@roomsily",
    creator: "@roomsily",
    images: ["/roomsily-og.svg"],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
}
