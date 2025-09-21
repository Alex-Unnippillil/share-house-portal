export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Onyx",
  description:
    "Onyx SaaS PWA Template with validated CRUD ops, user authentication + RBAC, maximum header security, Rust API runtime, TanStack, and more.",
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
  links: {
    twitter: "https://twitter.com/r_mourey_jr",
    github: "https://github.com/rmourey26/onyx",
    login: "/auth",
    signup: "/onboarding",
    contact: "/contact",
    linkedin: "https://linkedin.com/in/robertmoureyjr",
  },
}
