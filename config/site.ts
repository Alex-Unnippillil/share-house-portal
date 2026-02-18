export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Roomsily",
  description:
    "Roomsily is the tenant portal for shared-house rent, bookings, documents, and roommate coordination.",
  mainNav: [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Payments", href: "/payments" },
    { title: "Bookings", href: "/bookings" },
    { title: "Documents", href: "/documents" },
    { title: "Messaging", href: "/messaging" },
    { title: "Maintenance", href: "/maintenance" },
    { title: "Visitors", href: "/visitors" },
    { title: "Account", href: "/account" },
  ],
  links: {
    login: "/auth",
    signup: "/onboarding",
  },
}
