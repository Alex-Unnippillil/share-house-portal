import { Metadata } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { amenityCategories } from "./data/amenities"

export const metadata: Metadata = {
  title: "Amenities",
  description:
    "See everything included with your membership, from shared spaces to resident services.",
}

export default function AmenitiesPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="space-y-4 text-center md:text-left">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tenant Resources
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Community Amenities
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Designed for modern coliving—bring your suitcase, we provide the rest. Explore
              the comforts, shared spaces, and resident services available in every home.
            </p>
          </div>
        </header>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2">
          {amenityCategories.map((category) => (
            <Card key={category.title} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{category.title}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {category.items.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.details}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
