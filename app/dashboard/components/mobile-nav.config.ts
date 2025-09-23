import { type LucideIcon } from "lucide-react"
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  UserRound,
} from "lucide-react"

export type MobileNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const MOBILE_TOUCH_TARGET_MIN_HEIGHT = 48
export const MOBILE_TOUCH_TARGET_CLASSNAMES = "h-12 min-h-[48px]"

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
  },
  {
    label: "Messaging",
    href: "/messaging",
    icon: MessageCircle,
  },
  {
    label: "Schedule",
    href: "/schedule",
    icon: CalendarDays,
  },
  {
    label: "Profile",
    href: "/account",
    icon: UserRound,
  },
]
