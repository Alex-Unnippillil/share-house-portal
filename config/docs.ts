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
      title: "Account",
      href: "/account",
    },
    {
      title: "Dashboard",
      href: "/dashboard",
    },
    {
      title: "Payments",
      href: "/dashboard/payments",
    },
    {
      title: "Bookings",
      href: "/dashboard/bookings",
    },
    {
      title: "Documents",
      href: "/dashboard/documents",
    },
    {
      title: "Messaging",
      href: "/dashboard/messages",
    },
    {
      title: "Maintenance",
      href: "/dashboard/maintenance",
    },
    {
      title: "Visitors",
      href: "/dashboard/visitors",
    },
    {
      title: "Support",
      href: "/contact",
    },
  ],
  sidebarNav: [
    {
      title: "Tenant Hub",
      items: [
        {
          title: "Payments",
          href: "/dashboard/payments",
          items: [],
        },
        {
          title: "Bookings",
          href: "/dashboard/bookings",
          items: [],
        },
        {
          title: "Documents",
          href: "/dashboard/documents",
          items: [],
        },
        {
          title: "Messaging",
          href: "/dashboard/messages",
          items: [],
        },
        {
          title: "Maintenance",
          href: "/dashboard/maintenance",
          items: [],
        },
        {
          title: "Visitors",
          href: "/dashboard/visitors",
          items: [],
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          title: "Profile",
          href: "/account",
          items: [],
        },
        {
          title: "Support",
          href: "/contact",
          items: [],
        },
      ],
    },
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