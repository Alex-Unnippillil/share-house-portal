import Image, { type ImageProps } from "next/image"
import { forwardRef } from "react"

import {
  DEFAULT_BLUR_DATA_URL,
  RESPONSIVE_IMAGE_SIZES,
} from "@/components/media/constants"

export type ResponsiveImageProps = Omit<
  ImageProps,
  "placeholder" | "blurDataURL" | "sizes" | "unoptimized"
> & {
  placeholder?: ImageProps["placeholder"]
  blurDataURL?: ImageProps["blurDataURL"]
  sizes?: ImageProps["sizes"]
  unoptimized?: ImageProps["unoptimized"]
}

export const ResponsiveImage = forwardRef<HTMLImageElement, ResponsiveImageProps>(
  (
    {
      alt,
      placeholder = "blur",
      sizes = RESPONSIVE_IMAGE_SIZES,
      blurDataURL,
      unoptimized,
      ...rest
    },
    ref
  ) => {
    const shouldDisableOptimization =
      typeof rest.src === "string" &&
      (rest.src.startsWith("data:") || rest.src.startsWith("blob:"))

    const resolvedBlurDataURL =
      placeholder === "blur"
        ? blurDataURL ?? DEFAULT_BLUR_DATA_URL
        : blurDataURL

    return (
      <Image
        ref={ref}
        alt={alt}
        placeholder={placeholder}
        blurDataURL={resolvedBlurDataURL}
        sizes={sizes}
        unoptimized={unoptimized ?? shouldDisableOptimization}
        {...rest}
      />
    )
  }
)

ResponsiveImage.displayName = "ResponsiveImage"
