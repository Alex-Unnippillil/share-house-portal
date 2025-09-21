import { MainNavItem, SidebarNavItem } from "types/nav"

interface DocsConfig {
  mainNav: MainNavItem[]
  sidebarNav: SidebarNavItem[]
}

export const docsConfig: DocsConfig = {
  mainNav: [
    {
      title: "Rent Payments",
      href: "/dashboard/payments",
    },
    {
      title: "Amenities",
      href: "/amenities",
    },
    {
      title: "Documents",
      href: "/documents",
    },
    {
      title: "Floorplans",
      href: "/floorplans",
    },
    {
      title: "Message Board",
      href: "/message-board",
    },
    {
      title: "Admin",
      href: "/admin",
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