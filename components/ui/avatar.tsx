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

type AvatarImageProps = {
  onLoadingStatusChange?: React.ComponentPropsWithoutRef<
    typeof AvatarPrimitive.Image
  >["onLoadingStatusChange"]
} &
  Omit<ImageProps, "alt"> & {
    alt?: string
  }

const DEFAULT_AVATAR_SIZE = 40

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, alt = "", width, height, sizes, onLoadingStatusChange, ...imageProps }, ref) => {
  const resolvedWidth = width ?? height ?? DEFAULT_AVATAR_SIZE
  const resolvedHeight = height ?? width ?? DEFAULT_AVATAR_SIZE
  const resolvedSizes = sizes ?? `${resolvedWidth}px`

  return (
    <AvatarPrimitive.Image ref={ref} asChild onLoadingStatusChange={onLoadingStatusChange}>
      <Image
        className={cn("size-full object-cover", className)}
        alt={alt}
        width={resolvedWidth}
        height={resolvedHeight}
        sizes={resolvedSizes}
        {...imageProps}
      />
    </AvatarPrimitive.Image>
  )
})
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
