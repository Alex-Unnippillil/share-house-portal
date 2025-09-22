import { cn } from "@/lib/utils"

import SideNavContent from "./client/side-nav-content"
import { type NavLinkItem } from "./client/nav-links"

interface SideNavProps {
  links: NavLinkItem[]
}

export default function SideNav({ links }: SideNavProps) {
  return (
    <SideNavContent
      className={cn("flex-1", "hidden lg:block", "dark:bg-gradient-dark")}
      links={links}
    />
  )
}
