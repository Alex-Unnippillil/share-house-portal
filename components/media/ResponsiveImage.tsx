import Image, { type ImageProps } from "next/image"

import { cn } from "@/lib/utils"

const DEFAULT_SIZES = "(min-width: 1536px) 1280px, (min-width: 1280px) 1024px, (min-width: 768px) 768px, 100vw"

export type ResponsiveImageProps = Omit<ImageProps, "className" | "loading" | "sizes"> & {
  className?: string
  loading?: ImageProps["loading"]
  sizes?: ImageProps["sizes"]
}

export function ResponsiveImage({
  className,
  priority,
  loading,
  sizes = DEFAULT_SIZES,
  alt,
  ...props
}: ResponsiveImageProps) {
  const resolvedLoading = priority ? "eager" : loading ?? "lazy"

  return (
    <Image
      {...props}
      alt={alt}
      priority={priority}
      sizes={sizes}
      loading={resolvedLoading}
      className={cn("w-full", className)}
    />
  )
}
