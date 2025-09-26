"use client"

import * as React from "react"
import Image, { type ImageProps } from "next/image"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex size-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

type PrimitiveAvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>

type AvatarImageProps = Omit<PrimitiveAvatarImageProps, "asChild" | "className" | "src"> &
  Omit<ImageProps, "className" | "ref"> & {
    className?: string
    src: ImageProps["src"]
  }

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(
  (
    {
      className,
      alt,
      src,
      sizes = "48px",
      priority = false,
      placeholder = "empty",
      blurDataURL,
      loading,
      onLoadingStatusChange,
      crossOrigin,
      referrerPolicy,
      decoding,
      fill,
      width,
      height,
      ...imageProps
    },
    ref
  ) => {
    const resolvedClassName = cn("aspect-square size-full", className)
    const resolvedSrc = typeof src === "string" ? src : src.src
    const shouldUseFill = fill ?? (width === undefined && height === undefined)

    const resolvedLoading = priority ? undefined : loading

    return (
      <AvatarPrimitive.Image
        ref={ref}
        alt={alt}
        src={resolvedSrc}
        loading={resolvedLoading}
        onLoadingStatusChange={onLoadingStatusChange}
        crossOrigin={crossOrigin}
        referrerPolicy={referrerPolicy}
        decoding={decoding}
        asChild
      >
        <Image
          alt={alt}
          src={src}
          sizes={sizes}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          className={resolvedClassName}
          loading={resolvedLoading}
          fill={shouldUseFill}
          width={shouldUseFill ? undefined : width}
          height={shouldUseFill ? undefined : height}
          crossOrigin={crossOrigin}
          referrerPolicy={referrerPolicy}
          decoding={decoding}
          {...imageProps}
        />
      </AvatarPrimitive.Image>
    )
  }
)
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex size-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
