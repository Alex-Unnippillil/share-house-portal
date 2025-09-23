export type ShareOutcome = "shared" | "copied"

interface MinimalNavigator {
  share?: Navigator["share"]
  canShare?: Navigator["canShare"]
  clipboard?: Pick<Navigator["clipboard"], "writeText"> | null
}

interface ShareLinkOptions {
  shareData: ShareData
  fallbackValue: string
  navigatorOverride?: MinimalNavigator
  clipboardOverride?: Pick<Navigator["clipboard"], "writeText"> | null
}

function getNavigator(options: ShareLinkOptions): MinimalNavigator | undefined {
  if (options.navigatorOverride) {
    return options.navigatorOverride
  }

  if (typeof navigator !== "undefined") {
    return navigator
  }

  return undefined
}

function getClipboard(
  options: ShareLinkOptions,
  nav: MinimalNavigator | undefined,
): Pick<Navigator["clipboard"], "writeText"> | null {
  if (options.clipboardOverride) {
    return options.clipboardOverride
  }

  return nav?.clipboard ?? null
}

export async function shareLink(options: ShareLinkOptions): Promise<ShareOutcome> {
  const nav = getNavigator(options)
  const clipboard = getClipboard(options, nav)

  if (nav?.share) {
    try {
      const canShare = typeof nav.canShare === "function" ? nav.canShare(options.shareData) : true
      if (canShare) {
        await nav.share(options.shareData)
        return "shared"
      }
    } catch (error) {
      console.warn("navigator.share failed, falling back to clipboard", error)
    }
  }

  if (clipboard?.writeText) {
    await clipboard.writeText(options.fallbackValue)
    return "copied"
  }

  throw new Error("Share APIs are unavailable")
}
