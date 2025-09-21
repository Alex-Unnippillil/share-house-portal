export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "ShareHouse Portal",
  description:
    "Shared house tenant portal with rent payments, amenity scheduling, digital leases, realtime community tools, and an admin back office.",
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
      title: "OpenAI",
      href: "/playground",
    },
    {
      title: "Podcasts",
      href: "/music",
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
