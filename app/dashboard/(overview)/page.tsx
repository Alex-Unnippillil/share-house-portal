import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { OptionalWidgetLauncher } from "./components/OptionalWidgetLauncher";

export default function DashboardOverviewPage() {
        return (
                <div className="flex w-full flex-col gap-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                                        <p className="text-sm text-muted-foreground">
                                                Here’s what changed around the house since you last signed in.
                                        </p>
                                </div>
                                <div className="flex gap-2">
                                        <Link href="/payments">
                                                <Button size="sm">Pay rent</Button>
                                        </Link>
                                        <Link href="/bookings">
                                                <Button size="sm" variant="outline">
                                                        Reserve amenity
                                                </Button>
                                        </Link>
                                </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Card>
                                        <CardHeader>
                                                <CardTitle>Next rent due</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                                <div>
                                                        <div className="text-sm text-muted-foreground">Amount</div>
                                                        <div className="text-2xl font-semibold">$1,260.00</div>
                                                        <div className="mt-1 text-sm text-muted-foreground">Due on the 1st</div>
                                                </div>
                                                <Link href="/payments" className="inline-block">
                                                        <Button size="sm">View details</Button>
                                                </Link>
                                        </CardContent>
                                </Card>

                                <Card>
                                        <CardHeader>
                                                <CardTitle>Maintenance status</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                                <p className="font-medium">1 open request</p>
                                                <p className="text-muted-foreground">
                                                        Leaky kitchen tap is scheduled with FixRight Plumbing for Friday at 3PM.
                                                </p>
                                                <Link href="/maintenance" className="inline-block">
                                                        <Button variant="outline" size="sm">
                                                                Track request
                                                        </Button>
                                                </Link>
                                        </CardContent>
                                </Card>

                                <Card>
                                        <CardHeader>
                                                <CardTitle>Latest documents</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                                <ul className="space-y-2">
                                                        <li>Lease agreement v2.pdf</li>
                                                        <li>House rules.pdf</li>
                                                </ul>
                                                <Link href="/documents" className="inline-block">
                                                        <Button variant="outline" size="sm">
                                                                Open library
                                                        </Button>
                                                </Link>
                                        </CardContent>
                                </Card>

                                <Card>
                                        <CardHeader>
                                                <CardTitle>Amenity bookings</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                                <p className="font-medium">This week’s reservations</p>
                                                <ul className="space-y-1 text-muted-foreground">
                                                        <li>Tue 7PM · PlayStation nook · Jordan</li>
                                                        <li>Thu 6PM · Kitchen prep · Avery</li>
                                                        <li>Sat 9AM · Parking spot B · Micah</li>
                                                </ul>
                                                <Link href="/schedule" className="inline-block">
                                                        <Button variant="outline" size="sm">
                                                                Manage schedule
                                                        </Button>
                                                </Link>
                                        </CardContent>
                                </Card>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                                <Card>
                                        <CardHeader>
                                                <CardTitle>Roommate board</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                                <ul className="space-y-2 text-sm">
                                                        <li>Jordan: Wi-Fi is down, rebooted router.</li>
                                                        <li>Avery: Parking spot swap this weekend?</li>
                                                        <li>Micah: Added chore swap schedule for Sunday.</li>
                                                </ul>
                                                <Link href="/messaging" className="mt-4 inline-block">
                                                        <Button variant="outline" size="sm">
                                                                Go to messages
                                                        </Button>
                                                </Link>
                                        </CardContent>
                                </Card>
                                <Card>
                                        <CardHeader>
                                                <CardTitle>This week’s chores</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                                <div className="flex items-center justify-between rounded-md border p-3">
                                                        <span>Trash & recycling</span>
                                                        <span className="text-muted-foreground">Due Thu · Avery</span>
                                                </div>
                                                <div className="flex items-center justify-between rounded-md border p-3">
                                                        <span>Common area tidy</span>
                                                        <span className="text-muted-foreground">Due Sat · Jordan</span>
                                                </div>
                                                <div className="flex items-center justify-between rounded-md border p-3">
                                                        <span>Supply run</span>
                                                        <span className="text-muted-foreground">Due Sun · Micah</span>
                                                </div>
                                                <Link href="/chores" className="inline-block">
                                                        <Button variant="outline" size="sm">
                                                                Update chores
                                                        </Button>
                                                </Link>
                                        </CardContent>
                                </Card>
                        </div>

                        <OptionalWidgetLauncher />
                </div>
        );
}
