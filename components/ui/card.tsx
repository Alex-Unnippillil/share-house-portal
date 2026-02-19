import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { uiLayerTokens } from "@/components/ui/layer-styles"

const cardVariants = cva("rounded-xl text-card-foreground", {
  variants: {
    variant: {
      solid: uiLayerTokens.surfaces.solid,
      glass: uiLayerTokens.surfaces.glass,
      elevated: uiLayerTokens.surfaces.elevated,
    },
    interactive: {
      true: uiLayerTokens.surfaceHover,
      false: "",
    },
  },
  defaultVariants: {
    variant: "solid",
    interactive: false,
  },
})

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof cardVariants>, "variant"> {
  surface?: VariantProps<typeof cardVariants>["variant"]
  variant?: VariantProps<typeof cardVariants>["variant"]
}

const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, surface, variant, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant: variant ?? surface, interactive }), className)}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
