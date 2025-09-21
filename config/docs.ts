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
      roles: ["tenant", "roommate", "property_manager", "admin"],
    },
    {
      title: "Dashboard",
      href: "/dashboard",
      roles: ["tenant", "roommate", "property_manager", "admin"],
    },
    {
      title: "OpenAI",
      href: "/playground",
      roles: ["admin"],
    },

    {
      title: "Podcasts",
      href: "/music",
      roles: ["admin"],
    },
    {
      title: "Blog",
      href: "/blog",
    },
    {
      title: "RBAC",
      href: "/dashboard/members",
      roles: ["property_manager", "admin"],
    },
    {
      title: "About",
      href: "/about",
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
          roles: ["tenant", "roommate", "property_manager", "admin"],
        },
      ],
    },
  ],
}