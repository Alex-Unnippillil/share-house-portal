"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

// Dynamically import the 3D component with no SSR
const FeaturePrism = dynamic(() => import("@/components/feature-prism"), {
  ssr: false,
  loading: () => <LoadingFallback />,
})

function LoadingFallback() {
  return (
    <div className="bg-arctic-gradient flex h-[70vh] w-full items-center justify-center md:h-[80vh]">
      <div className="text-center">
        <div
          className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-muted-foreground">Loading 3D visualization...</p>
      </div>
    </div>
  )
}

export default function PrismContainer() {
  return (
    <div className="h-[70vh] w-full md:h-[80vh]">
      <Suspense fallback={<LoadingFallback />}>
        <FeaturePrism />
      </Suspense>
    </div>
  )
}
