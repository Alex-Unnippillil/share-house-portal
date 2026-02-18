import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"

import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"

import { CookieButton } from "@/components/cookie-button"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { fontSans } from "@/lib/font"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
import { ReactQueryClientProvider } from "@/components/react-query-client-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.roomsily"),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en-US",
      "de-DE": "/de-DE",
      "es-ES": "/es-ES",
      "fr-FR": "/fr-FR",
      "jp-JP": "/jp-JP",
      "ko-KO": "/ko-KP",
      "zh-ZH": "/zh-ZH",
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
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
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
  maximumScale: 1,
  userScalable: false,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ReactQueryClientProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable,
            inter.className
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <Analytics />
            <SpeedInsights />
            <CookieButton />
            <TailwindIndicator />
          </ThemeProvider>
        </body>
      </html>
    </ReactQueryClientProvider>
  )
}
