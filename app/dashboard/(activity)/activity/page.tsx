import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const timeline = [
        { time: "08:42", actor: "Jordan", action: "closed", item: "maintenance ticket" },
        { time: "10:17", actor: "Avery", action: "scheduled", item: "PlayStation nook" },
        { time: "13:05", actor: "Micah", action: "shared", item: "new grocery list" },
        { time: "19:24", actor: "Jordan", action: "posted", item: "message in #house-updates" },
];

const visitors = [
        { guest: "Chris H.", host: "Avery", range: "Fri 7pm - Sat 11am", status: "Approved" },
        { guest: "Morgan B.", host: "Jordan", range: "Sat 6pm - Sun 9am", status: "Pending" },
];

export default function DashboardActivityPage() {
        return (
                <div className="space-y-6">
                        <header className="space-y-1">
                                <h1 className="text-2xl font-semibold">Household activity</h1>
                                <p className="text-sm text-muted-foreground">
                                        Follow the latest roommate updates, visitor approvals, and amenity changes.
                                </p>
                        </header>

                        <Card>
                                <CardHeader>
                                        <CardTitle>Timeline</CardTitle>
                                        <CardDescription>Most recent actions within the last 24 hours.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                        {timeline.map((entry) => (
                                                <div key={`${entry.time}-${entry.actor}`} className="flex items-start gap-3">
                                                        <span className="mt-1 size-2 rounded-full bg-emerald-500" aria-hidden />
                                                        <div className="flex-1 rounded-md border p-3">
                                                                <p className="text-xs text-muted-foreground">{entry.time}</p>
                                                                <p className="text-sm">
                                                                        <span className="font-medium">{entry.actor}</span> {entry.action} the {entry.item}.
                                                                </p>
                                                        </div>
                                                </div>
                                        ))}
                                </CardContent>
                        </Card>

                        <div className="grid gap-4 lg:grid-cols-2">
                                <Card>
                                        <CardHeader>
                                                <CardTitle>Upcoming visitors</CardTitle>
                                                <CardDescription>Needs approval within 12 hours of arrival.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                                {visitors.map((visit) => (
                                                        <div key={visit.guest} className="rounded-md border p-3">
                                                                <p className="font-medium">{visit.guest}</p>
                                                                <p className="text-muted-foreground">Host: {visit.host}</p>
                                                                <p className="text-muted-foreground">{visit.range}</p>
                                                                <p className="text-xs font-medium text-emerald-500">{visit.status}</p>
                                                        </div>
                                                ))}
                                        </CardContent>
                                </Card>
                                <Card>
                                        <CardHeader>
                                                <CardTitle>Tasks in progress</CardTitle>
                                                <CardDescription>Items assigned through the message board.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                                <div className="rounded-md border p-3">
                                                        <p className="font-medium">Set up recycling labels</p>
                                                        <p className="text-muted-foreground">Assigned to Micah · Due tomorrow</p>
                                                </div>
                                                <div className="rounded-md border p-3">
                                                        <p className="font-medium">Confirm pest control visit</p>
                                                        <p className="text-muted-foreground">Assigned to Jordan · Due Friday</p>
                                                </div>
                                                <div className="rounded-md border p-3">
                                                        <p className="font-medium">Collect parking remote</p>
                                                        <p className="text-muted-foreground">Assigned to Avery · Due Sunday</p>
                                                </div>
                                        </CardContent>
                                </Card>
                        </div>
                </div>
        );
}
