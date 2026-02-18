import { MainNavItem, SidebarNavItem } from "types/nav"

interface DocsConfig {
  mainNav: MainNavItem[]
  sidebarNav: SidebarNavItem[]
}

export const docsConfig: DocsConfig = {
  mainNav: [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Payments", href: "/payments" },
    { title: "Bookings", href: "/bookings" },
    { title: "Documents", href: "/documents" },
    { title: "Messaging", href: "/messaging" },
    { title: "Maintenance", href: "/maintenance" },
    { title: "Visitors", href: "/visitors" },
    { title: "Account", href: "/account" },
  ],
  sidebarNav: [
    {
      title: "Account",
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
