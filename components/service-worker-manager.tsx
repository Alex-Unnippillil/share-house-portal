'use client'

import { useEffect } from 'react'

const SERVICE_WORKER_URL = '/sw.js'
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000

export function ServiceWorkerManager() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[service-worker] Registration skipped in development mode')
      return
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[service-worker] Service workers are not supported in this browser')
      return
    }

    let updateInterval: ReturnType<typeof window.setInterval> | undefined

    const monitorRegistration = (registration: ServiceWorkerRegistration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) {
          return
        }

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.info('[service-worker] New version available — refresh to update')
            } else {
              console.info('[service-worker] Content cached for offline use')
            }
          }
        })
      })
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
          scope: '/',
        })

        monitorRegistration(registration)
        await registration.update()

        updateInterval = window.setInterval(() => {
          registration.update().catch((error) => {
            console.warn('[service-worker] Periodic update check failed', error)
          })
        }, UPDATE_CHECK_INTERVAL)
      } catch (error) {
        console.error('[service-worker] Registration failed', error)
      }
    }

    registerServiceWorker()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker
          .getRegistration(SERVICE_WORKER_URL)
          .then((registration) => registration?.update())
          .catch((error) => {
            console.warn('[service-worker] Visibility update check failed', error)
          })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (updateInterval) {
        window.clearInterval(updateInterval)
      }
    }
  }, [])

  return null
}
