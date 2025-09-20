export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Share House Portal",
  description:
    "A streamlined rental property hub where tenants can pay rent, access lease documents, coordinate shared amenities, and stay connected with their housemates.",
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Pay rent",
      href: "/#payments",
    },
    {
      title: "Amenities",
      href: "/#essentials",
    },
    {
      title: "Community",
      href: "/#community",
    },
    {
      title: "Account",
      href: "/account",
    },
  ],
  links: {
    twitter: "https://twitter.com/sharehouse",
    github: "https://github.com/share-house",
    login: "/auth",
    signup: "/onboarding",
    contact: "/contact",
    linkedin: "https://linkedin.com/company/share-house-collective",
  },
}
