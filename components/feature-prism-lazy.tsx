"use client"

import dynamic from "next/dynamic"

import LazyMount from "@/components/landing/lazy-mount"

type FeaturePrismLazyProps = {
  className?: string
  rootMargin?: string
  idleTimeoutMs?: number
  fallbackLabel?: string
}

function PrismFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-primary/40 bg-background/70 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

const FeaturePrism = dynamic(() => import("@/components/feature-prism"), {
  ssr: false,
  loading: () => <PrismFallback label="Warming up 3D preview…" />,
})

export default function FeaturePrismLazy({
  className,
  rootMargin,
  idleTimeoutMs,
  fallbackLabel = "Warming up 3D preview…",
}: FeaturePrismLazyProps) {
  return (
    <LazyMount
      className={className}
      rootMargin={rootMargin}
      idleTimeoutMs={idleTimeoutMs}
      fallback={<PrismFallback label={fallbackLabel} />}
    >
      <FeaturePrism />
    </LazyMount>
  )
}
