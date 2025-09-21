export type Amenity = {
  name: string
  details: string
}

export type AmenityCategory = {
  title: string
  description: string
  items: Amenity[]
}

export const amenityCategories: AmenityCategory[] = [
  {
    title: "Comforts & Essentials",
    description:
      "Everything you need to feel settled from your first day in the community.",
    items: [
      {
        name: "Move-in ready suites",
        details:
          "Fully furnished rooms with premium mattresses, blackout shades, and plenty of closet space to make unpacking effortless.",
      },
      {
        name: "Stocked kitchens",
        details:
          "Shared kitchens include stainless appliances, cookware, dishware, and weekly restocking of pantry basics and coffee.",
      },
      {
        name: "On-site laundry",
        details:
          "High-capacity washers and dryers with detergent refills provided—no need to haul baskets across town.",
      },
    ],
  },
  {
    title: "Shared Spaces",
    description:
      "Flexible areas designed for connection, focus, and relaxation.",
    items: [
      {
        name: "Cowork lounge",
        details:
          "Quiet workstations, private call booths, and blazing-fast Wi-Fi support your work-from-home days.",
      },
      {
        name: "Community kitchen & dining",
        details:
          "Host potlucks or weekday dinners with oversized tables, smart displays, and reservation-friendly scheduling.",
      },
      {
        name: "Courtyard retreat",
        details:
          "Grilling stations, fire pits, and plenty of seating for movie nights or weekend brunch under the string lights.",
      },
    ],
  },
  {
    title: "Smart Home & Connectivity",
    description:
      "Secure, connected living with technology that just works.",
    items: [
      {
        name: "Keyless access",
        details:
          "Mobile credentials and guest passes keep your suite secure while making shared access simple.",
      },
      {
        name: "Whole-building Wi-Fi",
        details:
          "Enterprise-grade mesh network delivers consistent coverage indoors and across outdoor gathering areas.",
      },
      {
        name: "Climate controls",
        details:
          "In-room smart thermostats learn your schedule to keep temperatures comfortable and energy efficient.",
      },
    ],
  },
  {
    title: "Services & Support",
    description:
      "Perks that remove the hassle from city living.",
    items: [
      {
        name: "Weekly cleanings",
        details:
          "Professional cleaners tidy shared spaces and refresh essentials so everyone enjoys a spotless home.",
      },
      {
        name: "Resident support team",
        details:
          "On-site community managers and a 24/7 chat line help with maintenance, deliveries, and neighborhood tips.",
      },
      {
        name: "Wellness programming",
        details:
          "Monthly workshops, yoga on the roof, and partnerships with local studios keep our community thriving.",
      },
    ],
  },
]
