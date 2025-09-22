export type SiteConfig = typeof siteConfig

export const siteConfig = {
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
  },
}
