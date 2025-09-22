import * as React from "react"

import { cn } from "@/lib/utils"

const SPRITE_PATH = "/icons/sprite.svg"

export type IconName =
  | "sun"
  | "sun-medium"
  | "moon"
  | "menu"
  | "linkedin"
  | "chevron-right"
  | "calendar"
  | "bell"
  | "x"
  | "check"
  | "check-check"
  | "cuboid"
  | "shield"
  | "zap"
  | "link"
  | "cog"
  | "database"

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName
  title?: string
}

export function Icon({
  name,
  title,
  className,
  stroke = "currentColor",
  fill = "none",
  strokeWidth = 2,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  ...props
}: IconProps) {
  const symbolId = `${SPRITE_PATH}#icon-${name}`
  const isDecorative = !title

  return (
    <svg
      aria-hidden={isDecorative}
      role={title ? "img" : "presentation"}
      focusable="false"
      className={cn("inline-block", className)}
      stroke={stroke}
      fill={fill}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <use href={symbolId} xlinkHref={symbolId} />
    </svg>
  )
}

Icon.displayName = "Icon"
