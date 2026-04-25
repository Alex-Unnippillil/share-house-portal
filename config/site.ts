import { publicNav, roleNavigation } from "@/config/navigation"

export type SiteConfig = typeof siteConfig

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@roomsily.com"
const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+1-555-010-0000"

export const siteConfig = {
  name: "Roomsily",
  description:
    "www.roomsily is the modern co-living HQ for effortless rent, amenities, and roommate communication.",
  mainNav: [...publicNav, ...roleNavigation.tenant.primaryNav],
  links: {
    login: "/auth",
    signup: "/onboarding",
    contact: "/contact",
  },
  support: {
    email: supportEmail,
    phone: supportPhone,
  },
}
