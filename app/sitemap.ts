import type { MetadataRoute } from "next"

const now = new Date()

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://roomsily.app",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://roomsily.app/auth",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://roomsily.app/onboarding",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://roomsily.app/privacy",
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://roomsily.app/terms",
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]
}
