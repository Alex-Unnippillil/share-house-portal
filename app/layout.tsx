import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"
import { fontSans } from "@/lib/font"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { CookieButton } from "@/components/cookie-button"
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { AppShell } from "@/components/layouts/layout-primitives"
import { ReactQueryClientProvider } from "@/components/react-query-client-provider"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"
import { metadata, viewport } from "@/app/site-metadata"

export { metadata, viewport }

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
            <AppShell>
              <div className="flex-1">
                <ErrorBoundary>
                  <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
                </ErrorBoundary>
                <Toaster />
                <Analytics />
                <SpeedInsights />
              </div>
            </AppShell>

            {/*
enter your api info from termly.io or a provider of your choice
<Script
  type="text/javascript"
  src="https://app.termly.io/resource-blocker/123456789abcdefg"/>

 */}
            <CookieButton />
            <TailwindIndicator />
          </ThemeProvider>
        </body>
      </html>
    </ReactQueryClientProvider>
  )
}
