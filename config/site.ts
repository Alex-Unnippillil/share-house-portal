export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Share House Portal",
  description:
    "Share House is the tenant hub for tracking rent payments, booking amenities, reviewing documents, and staying connected with housemates.",
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
  links: {
    portal: "/",
    support: "/contact",
    amenities: "/amenities",
    leases: "/documents/leases",
    documents: "/documents",
    payments: "/dashboard/payments",
    messageBoard: "/message-board",
    admin: "/admin",
    login: "/auth",
    signup: "/onboarding",
    contact: "/contact",
  },
}
