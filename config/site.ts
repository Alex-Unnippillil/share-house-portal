import { getMainNavigationItems } from "@/config/navigation"

export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Roomsily",
  description:
    "www.roomsily is the modern co-living HQ for effortless rent, amenities, and roommate communication.",
  mainNav: getMainNavigationItems("public"),
  links: {
    login: "/auth",
    signup: "/onboarding",
    contact: "/contact",
  },
}
