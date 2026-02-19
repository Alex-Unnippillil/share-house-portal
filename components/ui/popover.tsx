"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { uiLayerTokens, uiMotionTokens } from "@/components/ui/layer-styles"
import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 bg-popover p-4 text-popover-foreground outline-none",
        uiLayerTokens.radiusMd,
        uiLayerTokens.surfaceBorder,
        uiLayerTokens.surfaceShadow,
        uiMotionTokens.floating,
        "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 motion-reduce:data-[side=bottom]:slide-in-from-top-0 motion-reduce:data-[side=left]:slide-in-from-right-0 motion-reduce:data-[side=right]:slide-in-from-left-0 motion-reduce:data-[side=top]:slide-in-from-bottom-0",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
