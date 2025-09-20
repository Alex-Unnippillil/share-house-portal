import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { CookieButton } from "@/components/cookie-button"
import { fontSans } from "@/lib/font"
import { siteConfig } from '@/config/site'
import { ReactQueryClientProvider } from '@/components/react-query-client-provider'
import { Toaster } from "@/components/ui/toaster"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { cn } from "@/lib/utils"
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: '/manifest.json',
  metadataBase: new URL('https://share-house.example.com'),
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
  keywords: [
    'rent payment portal',
    'shared housing management',
    'tenant amenities',
    'lease agreement download',
    'community message board',
    'rental property dashboard',
  ],
  authors: [{ name: 'Share House Collective' }],
  creator: 'Share House Collective',
  publisher: 'Share House Collective',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  generator: 'NextJS',
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
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
    url: "https://share-house.example.com",
    images: [
      {
        url: 'https://share-house.example.com/og-image.jpg',
        width: 1230,
        height: 640,
      },
      {
        url: 'https://share-house.example.com/twitter-image.jpg',
        width: 1800,
        height: 1600,
        alt: 'Share house common area',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    title: siteConfig.name,
    description: siteConfig.description,
    site: '@sharehouse',
    creator: '@sharehouse',
    images: [
      {
        url: 'https://share-house.example.com/twitter-image.jpg',
        width: 1800,
        height: 900,
      },
    ],
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
    <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            // Prevent FOUC (Flash of Unstyled Content)
            document.documentElement.classList.add('dark');
          `,
          }}
        />
      </head>
      <body className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable
          )}
        >
<ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
             <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <div className="flex-1">{children}<Toaster/><Analytics/><SpeedInsights/></div>
              
   </div>           
<SiteFooter/>


{/*
enter your api info from termly.io or a provider of your choice
<Script
  type="text/javascript"
  src="https://app.termly.io/resource-blocker/123456789abcdefg"/>

*/}
   <CookieButton />    
          </ThemeProvider>
        


</body>
    </html>
    </ReactQueryClientProvider>
  )
}
