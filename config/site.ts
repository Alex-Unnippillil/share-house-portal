export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Onyx",
  description:
    "Roommate portal for rent payments, amenity bookings, shared documents, and realtime communication.",
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
      title: "Bookings",
      href: "/bookings",
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
      title: "Account",
      href: "/account",
    },
    {
      title: "Contact",
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
