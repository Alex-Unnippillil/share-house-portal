import Link from "next/link"
import { Download, FileText, PenLine, ShieldCheck } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const agreementHighlights = [
  {
    title: "Digital signatures",
    description: "Every tenant can sign electronically. Completed copies are emailed instantly for your records.",
    icon: PenLine,
  },
  {
    title: "House guidelines",
    description: "The agreement summarises quiet hours, guest policies, and shared space expectations in plain language.",
    icon: ShieldCheck,
  },
  {
    title: "Transparent fees",
    description: "Deposit, pet policy, and utility sharing charts are included so there are no surprises later on.",
    icon: FileText,
  },
]

export function LeaseAgreementCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Lease agreement</CardTitle>
            <CardDescription>
              Access the latest agreement packet at any time. Review, download, or request an updated signature copy.
            </CardDescription>
          </div>
          <Badge variant="outline" className="whitespace-nowrap">Updated May 15, 2024</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Lease Agreement – Share House at Riverside</p>
              <p className="text-xs text-muted-foreground">
                PDF • 14 pages • Includes community addendum and amenity schedules
              </p>
            </div>
          </div>
          <Separator />
          <ul className="grid gap-4 md:grid-cols-3">
            {agreementHighlights.map((item) => (
              <li key={item.title} className="space-y-2">
                <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">Need a countersigned copy?</p>
          <p className="text-muted-foreground">
            Email management after you download and we will return a signed version within 24 hours.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/documents/lease-agreement.pdf" target="_blank" rel="noreferrer">
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview
            </Link>
          </Button>
          <Button asChild>
            <Link href="/documents/lease-agreement.pdf" download>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download PDF
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
