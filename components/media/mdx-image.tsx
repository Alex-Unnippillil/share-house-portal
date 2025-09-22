import { type ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

import { RESPONSIVE_IMAGE_SIZES } from "@/components/media/constants"
import {
  ResponsiveImage,
  type ResponsiveImageProps,
} from "@/components/media/responsive-image"

export type MdxImageProps = ComponentPropsWithoutRef<"img"> &
  Pick<ResponsiveImageProps, "priority" | "quality" | "sizes"> & {
    src: ResponsiveImageProps["src"]
    alt: string
  }

export function MdxImage({
  className,
  sizes = RESPONSIVE_IMAGE_SIZES,
  ...props
}: MdxImageProps) {
  return (
    <ResponsiveImage
      className={cn(
        "my-8 w-full rounded-lg border border-border bg-muted/30 object-cover",
        className
      )}
      sizes={sizes}
      {...props}
    />
  )
}
