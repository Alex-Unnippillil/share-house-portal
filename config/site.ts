export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Share House Portal",
  description:
    "The Share House Portal keeps roommates, tenants, and property managers aligned with rent collection, amenity reservations, visitor policies, and collaborative task tools.",
  mainNav: [
    {
      title: "Overview",
      href: "#overview",
    },
    {
      title: "Rent",
      href: "#rent",
    },
    {
      title: "Amenities",
      href: "#amenities",
    },
    {
      title: "Visitors",
      href: "#visitors",
    },
    {
      title: "Collaboration",
      href: "#collaboration",
    },
    {
      title: "Resources",
      href: "#resources",
    },
  ],
  links: {
    login: "/auth",
    signup: "/onboarding",
    contact: "/contact",
    tenantHandbook: "/resources/tenant-handbook",
    managerGuide: "/resources/manager-playbook",
    support: "/support",
    twitter: "https://twitter.com/sharehouseportal",
    github: "https://github.com/share-house-portal/share-house-portal",
    linkedin: "https://www.linkedin.com/company/share-house-portal",
    status: "https://status.sharehouseportal.app",
  },
}
