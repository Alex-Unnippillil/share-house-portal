import type { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://roomsily.app',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://roomsily.app/contact',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },

   {
      url: 'https://roomsily.app/onboarding',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]
}