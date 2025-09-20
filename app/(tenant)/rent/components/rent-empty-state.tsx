import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function RentEmptyState() {
  return (
    <Card className="mx-auto max-w-2xl text-center">
      <CardHeader>
        <CardTitle className="text-2xl">No lease on file</CardTitle>
        <CardDescription>
          Once your property manager assigns a lease, you&apos;ll see rent charges,
          payment history, and checkout actions here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Button asChild>
          <Link href="/contact">Contact support</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
