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
      title: "Amenities",
      href: "/amenities",
    },
    {
      title: "Community Guidelines",
      href: "/community-guidelines",
    },
    {
      title: "Blog",
      href: "/blog",
    },
    {
      title: "RBAC",
      href: "/dashboard/members",
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
  links: {
    twitter: "https://twitter.com/r_mourey_jr",
    github: "https://github.com/rmourey26/onyx",
    login: "/auth",
    signup: "/onboarding",
    contact: "/contact",
    linkedin: "https://linkedin.com/in/robertmoureyjr",
  },
}
