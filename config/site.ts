export type SiteNavItem = {
  title: string
  href: string
}

export type SiteLinks = {
  login: string
  signup: string
  contact: string
  roadmap?: string
  status?: string
}

export type SiteStatusConfig = {
  summaryUrl?: string
}

export type SiteConfig = {
  name: string
  description: string
  mainNav: SiteNavItem[]
  links: SiteLinks
  status?: SiteStatusConfig
}

export const siteConfig: SiteConfig = {
  name: "Roomsily",
  description:
    "www.roomsily is the modern co-living HQ for effortless rent, amenities, and roommate communication.",
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
      title: "Visitors",
      href: "/visitors",
    },
    {
      title: "Maintenance",
      href: "/maintenance",
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
  links: {
    login: "/auth",
    signup: "/onboarding",
    contact: "/contact",
    roadmap: "https://feedback.roomsily.example/roadmap",
    status: "https://status.roomsily.example",
  },
  status: {
    summaryUrl: "https://status.roomsily.example/api/v2/summary.json",
  },
}
