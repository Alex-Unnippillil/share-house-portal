import { MainNavItem, SidebarNavItem } from "types/nav"

interface DocsConfig {
  mainNav: MainNavItem[]
  sidebarNav: SidebarNavItem[]
}

export const docsConfig: DocsConfig = {
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Dashboard",
      href: "/dashboard",
    },
    {
      title: "Members",
      href: "/dashboard/members",
    },
    {
      title: "Payments",
      href: "/payments",
    },
    {
      title: "Documents",
      href: "/documents",
    },
    {
      title: "Messaging",
      href: "/messaging",
    },
    {
      title: "Account",
      href: "/account",
    },
    {
      title: "Contact",
      href: "/contact",
    },
  ],
  sidebarNav: [
    {
      title: "Tools",
      items: [
        {
          title: "Sign Out",
          href: "/signout",
          items: [],
        },
      ],
    },
  ],
}