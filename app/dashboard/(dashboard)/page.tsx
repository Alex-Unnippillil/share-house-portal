import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <div className="flex gap-2">
          <Link href="/payments">
            <Button size="sm">Pay rent</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Next rent due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Amount</div>
            <div className="text-2xl font-semibold">$1,260.00</div>
            <div className="mt-1 text-sm text-muted-foreground">Due on the 1st</div>
            <Link href="/payments" className="mt-4 inline-block">
              <Button size="sm">View details</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>Lease agreement v2.pdf</li>
              <li>House rules.pdf</li>
            </ul>
            <Link href="/documents" className="mt-4 inline-block">
              <Button variant="outline" size="sm">Open</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roommate board</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>Jordan: Wi-Fi is down, rebooted router.</li>
            <li>Avery: Parking spot swap this weekend?</li>
          </ul>
          <Link href="/messaging" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Go to messages</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}