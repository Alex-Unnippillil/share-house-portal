export function buildNavItems(buildingId: string) {
  return [
    { label: "Overview", href: `/dashboard?building=${buildingId}` },
    {
      label: "Maintenance",
      href: `/dashboard/maintenance?building=${buildingId}`,
    },
    { label: "Visitors", href: `/dashboard/visitors?building=${buildingId}` },
    {
      label: "Documents",
      href: `/dashboard/documents?building=${buildingId}`,
    },
    { label: "Analytics", href: `/dashboard/analytics?building=${buildingId}` },
  ]
}

