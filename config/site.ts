export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Shared House Portal",
  description:
    "Roommate portal for rent payments, shared documents, and realtime communication.",
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
