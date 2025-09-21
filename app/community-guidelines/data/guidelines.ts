export type Guideline = {
  title: string
  summary: string
  points: {
    title: string
    detail: string
  }[]
}

export const guidelines: Guideline[] = [
  {
    title: "Respect Shared Spaces",
    summary:
      "Common areas are for everyone—keep them welcoming so neighbors can enjoy them at any hour.",
    points: [
      {
        title: "Tidy as you go",
        detail:
          "Wipe down counters, return cookware, and store personal items after use so the next person starts fresh.",
      },
      {
        title: "Quiet hours",
        detail:
          "Indoor quiet hours run from 10 p.m. to 7 a.m. Please use headphones or reserve the media room for late-night gatherings.",
      },
      {
        title: "Guests",
        detail:
          "Register overnight guests through the resident app so our team knows who is on-site and can help with access.",
      },
    ],
  },
  {
    title: "Look Out for One Another",
    summary:
      "Community thrives when everyone feels safe, seen, and supported.",
    points: [
      {
        title: "Inclusive interactions",
        detail:
          "Treat every resident, guest, and team member with kindness. Harassment or discrimination of any kind is not tolerated.",
      },
      {
        title: "Wellness checks",
        detail:
          "If you have concerns about a neighbor, notify the community manager so we can check in discreetly and offer support.",
      },
      {
        title: "Pets",
        detail:
          "Approved pets are welcome. Keep animals on-leash in common areas and clean up promptly so spaces remain inviting.",
      },
    ],
  },
  {
    title: "Communicate Early",
    summary:
      "Transparency keeps the building running smoothly and prevents surprises for your housemates.",
    points: [
      {
        title: "Maintenance",
        detail:
          "Submit repair requests through the resident portal as soon as something feels off—we track and respond within one business day.",
      },
      {
        title: "Schedule the extras",
        detail:
          "Use the app to reserve amenities such as the cowork lounge or roof deck so everyone has visibility into availability.",
      },
      {
        title: "Extended travel",
        detail:
          "Leaving for more than seven nights? Let the community team know so we can keep an eye on packages and your suite.",
      },
    ],
  },
  {
    title: "Live Sustainably",
    summary:
      "Small actions add up—thank you for helping us minimize our environmental footprint.",
    points: [
      {
        title: "Waste sorting",
        detail:
          "Recycle, compost, and landfill bins are color-coded in each kitchen. Follow the signage and ask if you have questions.",
      },
      {
        title: "Energy use",
        detail:
          "Turn off lights when rooms are empty and close windows when the HVAC is running to keep energy use in check.",
      },
      {
        title: "Water",
        detail:
          "Report leaks immediately and keep showers to five minutes during high-demand hours to ensure hot water for everyone.",
      },
    ],
  },
]
