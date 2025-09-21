import { Metadata } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { guidelines } from "./data/guidelines"

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "Shared expectations that keep our homes respectful, safe, and enjoyable for every resident.",
}

export default function CommunityGuidelinesPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header className="space-y-4 text-center md:text-left">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tenant Resources
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Community Guidelines
            </h1>
            <p className="text-base text-muted-foreground">
              Our shared homes thrive when we take care of each other and the space. Use these
              guidelines as a reference for daily living and reach out to the community team with
              any questions.
            </p>
          </div>
        </header>
        <Separator />
        <div className="space-y-6">
          {guidelines.map((guideline) => (
            <Card key={guideline.title}>
              <CardHeader>
                <CardTitle className="text-xl">{guideline.title}</CardTitle>
                <CardDescription>{guideline.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {guideline.points.map((point) => (
                    <li key={point.title} className="space-y-1">
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {point.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{point.detail}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
