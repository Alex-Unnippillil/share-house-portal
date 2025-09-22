import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const paymentPerformance = [
        { label: "On time", value: 86, trend: "+4.2% vs last month" },
        { label: "Grace period", value: 11, trend: "-1.1% vs last month" },
        { label: "Overdue", value: 3, trend: "-0.8% vs last month" },
];

const amenityUtilisation = [
        { amenity: "Kitchen", rate: "78%", change: "+6%" },
        { amenity: "PlayStation nook", rate: "64%", change: "+3%" },
        { amenity: "Parking", rate: "92%", change: "+8%" },
        { amenity: "Shared computer", rate: "55%", change: "-5%" },
];

export default function DashboardAnalyticsPage() {
        return (
                <div className="space-y-6">
                        <header className="space-y-1">
                                <h1 className="text-2xl font-semibold">House analytics</h1>
                                <p className="text-sm text-muted-foreground">
                                        Track payment health, amenity utilisation, and roommate satisfaction to spot issues early.
                                </p>
                        </header>

                        <div className="grid gap-4 lg:grid-cols-3">
                                <Card className="lg:col-span-2">
                                        <CardHeader>
                                                <CardTitle>Payment performance</CardTitle>
                                                <CardDescription>
                                                        Rolling 90 day rent collection trend across the household.
                                                </CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid gap-3 sm:grid-cols-3">
                                                {paymentPerformance.map((item) => (
                                                        <div key={item.label} className="rounded-md border p-4">
                                                                <p className="text-sm text-muted-foreground">{item.label}</p>
                                                                <p className="text-3xl font-semibold">{item.value}%</p>
                                                                <p className="text-xs text-emerald-500">{item.trend}</p>
                                                        </div>
                                                ))}
                                        </CardContent>
                                </Card>

                                <Card>
                                        <CardHeader>
                                                <CardTitle>Revenue breakout</CardTitle>
                                                <CardDescription>Monthly rent split between tenants.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                                <div className="flex items-center justify-between rounded-md border p-3">
                                                        <span>Jordan</span>
                                                        <span className="font-medium">$640</span>
                                                </div>
                                                <div className="flex items-center justify-between rounded-md border p-3">
                                                        <span>Avery</span>
                                                        <span className="font-medium">$620</span>
                                                </div>
                                                <div className="flex items-center justify-between rounded-md border p-3">
                                                        <span>Micah</span>
                                                        <span className="font-medium">$600</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Autopay enabled for every roommate this cycle.</p>
                                        </CardContent>
                                </Card>
                        </div>

                        <Card>
                                <CardHeader>
                                        <CardTitle>Amenity utilisation</CardTitle>
                                        <CardDescription>Compare actual booking time against available hours for each shared space.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-3 md:grid-cols-2">
                                        {amenityUtilisation.map((item) => (
                                                <div key={item.amenity} className="rounded-md border p-4">
                                                        <p className="text-sm font-medium">{item.amenity}</p>
                                                        <p className="text-2xl font-semibold">{item.rate}</p>
                                                        <p className="text-xs text-muted-foreground">Change {item.change} vs last week</p>
                                                </div>
                                        ))}
                                </CardContent>
                        </Card>

                        <Card>
                                <CardHeader>
                                        <CardTitle>Sentiment pulse</CardTitle>
                                        <CardDescription>Lightweight survey results from the last roommate check-in.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-3 md:grid-cols-3">
                                        <div className="rounded-md border bg-emerald-500/10 p-4">
                                                <p className="text-sm font-medium">Overall satisfaction</p>
                                                <p className="text-3xl font-semibold">4.6/5</p>
                                                <p className="text-xs text-muted-foreground">All roommates responded this month.</p>
                                        </div>
                                        <div className="rounded-md border bg-amber-500/10 p-4">
                                                <p className="text-sm font-medium">Maintenance SLAs</p>
                                                <p className="text-3xl font-semibold">36 hrs</p>
                                                <p className="text-xs text-muted-foreground">Average to resolve non-urgent requests.</p>
                                        </div>
                                        <div className="rounded-md border bg-sky-500/10 p-4">
                                                <p className="text-sm font-medium">Noise reports</p>
                                                <p className="text-3xl font-semibold">1</p>
                                                <p className="text-xs text-muted-foreground">Last filed 18 days ago.</p>
                                        </div>
                                </CardContent>
                        </Card>
                </div>
        );
}
