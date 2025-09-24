"use client"

import * as React from "react"

import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

import { useConsentManager } from "@/components/consent-manager"

type DeferredCategory = "analytics" | "marketing"

function enableDeferredScripts(category: DeferredCategory) {
  if (typeof document === "undefined") {
    return
  }

  const selector = `script[type="text/plain"][data-consent-category="${category}"]:not([data-consent-loaded="true"])`
  const scripts = document.querySelectorAll<HTMLScriptElement>(selector)

  scripts.forEach((script) => {
    const executableScript = document.createElement("script")

    executableScript.type = "text/javascript"
    executableScript.async = script.async
    executableScript.defer = script.defer

    if (script.nonce) {
      executableScript.nonce = script.nonce
    }

    for (const attribute of Array.from(script.attributes)) {
      if (
        attribute.name === "type" ||
        attribute.name === "data-consent-category" ||
        attribute.name === "data-consent-loaded"
      ) {
        continue
      }

      executableScript.setAttribute(attribute.name, attribute.value)
    }

    if (script.src) {
      executableScript.src = script.src
    } else {
      executableScript.textContent = script.textContent
    }

    executableScript.dataset.consentLoaded = "true"
    script.dataset.consentLoaded = "true"

    script.parentNode?.insertBefore(executableScript, script.nextSibling)
  })
}

export function ConsentAwareScripts() {
  const { preferences, isReady } = useConsentManager()

  React.useEffect(() => {
    if (!isReady) {
      return
    }

    if (preferences.analytics) {
      enableDeferredScripts("analytics")
    }

    if (preferences.marketing) {
      enableDeferredScripts("marketing")
    }
  }, [isReady, preferences.analytics, preferences.marketing])

  if (!isReady) {
    return null
  }

  return (
    <>
      {preferences.analytics ? (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      ) : null}
    </>
  )
}
