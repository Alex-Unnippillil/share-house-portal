export const uiLayerTokens = {
  overlayDimming: "bg-background/70 dark:bg-black/70",
  overlayBlur: "supports-[backdrop-filter]:backdrop-blur-sm",
  surfaceBorder: "glass-border",
  surfaceShadow: "shadow-lg shadow-black/10 dark:shadow-black/40",
  surfaces: {
    solid: "card-solid",
    glass: "card-glass",
    elevated: "card-elevated",
  },
  surfaceHover: "card-interactive",
  navChrome: "nav-chrome",
  radiusMd: "rounded-md",
  radiusLg: "rounded-lg",
} as const

export const uiMotionTokens = {
  micro:
    "duration-150 ease-out motion-reduce:duration-0 motion-reduce:transition-none",
  overlay:
    "data-[state=open]:duration-200 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] motion-reduce:duration-0 motion-reduce:animate-none motion-reduce:data-[state=closed]:zoom-out-100 motion-reduce:data-[state=open]:zoom-in-100",
  floating:
    "data-[state=open]:duration-200 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] motion-reduce:duration-0 motion-reduce:animate-none motion-reduce:data-[state=closed]:zoom-out-100 motion-reduce:data-[state=open]:zoom-in-100",
} as const
