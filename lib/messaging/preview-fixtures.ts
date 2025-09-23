import { LinkPreview, seedPreview } from "./link-previews"

const defaults: LinkPreview[] = [
  {
    url: "https://househandbook.example.com/checklists/spring-deep-clean",
    canonicalUrl: "https://househandbook.example.com/checklists/spring-deep-clean",
    title: "Spring deep clean checklist",
    description:
      "Room-by-room instructions, supplies, and timing for coordinating the spring reset as a household.",
    image: "https://househandbook.example.com/assets/deep-clean.jpg",
    favicon: "https://househandbook.example.com/favicon.ico",
    siteName: "House Handbook",
    status: "ready",
    fetchedAt: new Date("2024-06-01T12:00:00.000Z").toISOString(),
  },
  {
    url: "https://communitywifi.example.com/installer-tracker",
    canonicalUrl: "https://communitywifi.example.com/installer-tracker",
    title: "Fiber installer availability",
    description:
      "Live calendar showing when the community fiber team can swing by for apartment installs.",
    image: "https://communitywifi.example.com/assets/tech-setup.jpg",
    favicon: "https://communitywifi.example.com/favicon.ico",
    siteName: "Community Wi-Fi",
    status: "ready",
    fetchedAt: new Date("2024-06-05T09:30:00.000Z").toISOString(),
  },
]

let seeded = false

export function ensureMessagingPreviewsSeeded() {
  if (seeded) return

  for (const preview of defaults) {
    seedPreview(preview)
  }

  seeded = true
}

