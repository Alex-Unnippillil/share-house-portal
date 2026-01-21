import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"

import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { CookieButton } from "@/components/cookie-button"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { fontSans } from "@/lib/font"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
import { ReactQueryClientProvider } from "@/components/react-query-client-provider"
import { SessionTimeoutProvider } from "@/components/session/session-timeout-provider"
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
    manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.roomsily'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'de-DE': '/de-DE',
      'es-ES': '/es-ES',
      'fr-FR': '/fr-FR',
      'jp-JP': '/jp-JP',
      'ko-KO': '/ko-KP',
      'zh-ZH': '/zh-ZH',
      'pt-PT': '/pt-PT',
    },
  },
  referrer: 'origin-when-cross-origin',
  keywords: ['Roomsily', 'NextJS 14 TypeScript', 'Supabase SSR', 'TanStack React Query', 'co-living software', 'rent payment portal', 'shadcn/ui', 'Tailwind CSS', 'SaaS', 'NextJS Supabase Postgres Tailwind TanStack', 'NextJS CSP',
             'PWA', 'NextJS SaaS PWA Template', 'CRUD ops', 'secure headers', 'NextJS templates with user authentication, RBAC, and CRUD ops', 'NextJS templates with data validation and database integration',
            'Rust API runtime for vercel serverless functions', 'NextJS secure headers', 'NextJS NextMDX'],
  authors: [{ name: 'Robert Mourey Jr' }],
  creator: 'Robert Mourey Jr',
  publisher: 'Robert Mourey Jr', 
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  generator: 'NextJS',
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
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    url: "https://www.roomsily",
    images: [
      {
        url: '/roomsily-og.svg',
        width: 1200,
        height: 630,
        alt: 'Roomsily — modern co-living hub',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
    twitter: {
         title: siteConfig.name,
         description: siteConfig.description,
         site: '@roomsily',
         creator: '@roomsily',
         images: ['/roomsily-og.svg'],
   },
}
export const viewport: Viewport =  {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: 'device-width',
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
        <head></head>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SessionTimeoutProvider>
              <div className="relative flex min-h-screen flex-col">
                {/* <SiteHeader /> */}
                <div className="flex-1">
                  <ErrorBoundary>
                    <Suspense fallback={<RouteSkeleton />}>
                      {children}
                    </Suspense>
                  </ErrorBoundary>
                  <Toaster />
                  <Analytics />
                  <SpeedInsights />
                </div>
              </div>

              {/* <SiteFooter/> */}

              {/*
              enter your api info from termly.io or a provider of your choice
              <Script
                type="text/javascript"
                src="https://app.termly.io/resource-blocker/123456789abcdefg"/>

               */}
              <CookieButton />
              <TailwindIndicator />
            </SessionTimeoutProvider>
          </ThemeProvider>
        </body>
      </html>
    </ReactQueryClientProvider>
  )
}
