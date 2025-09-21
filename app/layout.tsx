import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"

import "./globals.css"

import { ReactQueryClientProvider } from "@/components/react-query-client-provider"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { CookieButton } from "@/components/cookie-button"
import { siteConfig } from "@/config/site"
import { fontSans } from "@/lib/font"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL("https://sharehouseportal.app"),
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "share house portal",
    "roommate rent payments",
    "amenity booking software",
    "overnight visitor registration",
    "property manager dashboard",
    "stripe rent collection",
    "cal.com amenity scheduling",
    "supabase realtime messaging",
  ],
  authors: [{ name: "Share House Portal Team" }],
  creator: "Share House Portal",
  publisher: "Share House Portal",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      maxImagePreview: "large",
      maxSnippet: -1,
      maxVideoPreview: -1,
    },
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    url: "https://sharehouseportal.app",
    images: [
      {
        url: "/share-house-og.svg",
        width: 1200,
        height: 630,
        alt: "Share House Portal preview showing rent, amenities, and visitor logs",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    site: "@sharehouseportal",
    creator: "@sharehouseportal",
    images: [
      {
        url: "/share-house-og.svg",
        width: 1200,
        height: 630,
        alt: "Share House Portal preview showing rent, amenities, and visitor logs",
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
            inter.className,
          )}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <div className="flex-1">
                {children}
                <Toaster />
                <Analytics />
                <SpeedInsights />
              </div>
              <SiteFooter />
            </div>
            <TailwindIndicator />
            <CookieButton />
          </ThemeProvider>
        </body>
      </html>
    </ReactQueryClientProvider>
  )
}
