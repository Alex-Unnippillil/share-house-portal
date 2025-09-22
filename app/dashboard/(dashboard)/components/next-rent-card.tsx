import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRentSummary } from "../data"

export async function NextRentCard() {
        const summary = await getRentSummary()
        const formattedAmount = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
        }).format(summary.amount)

        return (
                <Card>
                        <CardHeader>
                                <CardTitle>Next rent due</CardTitle>
                        </CardHeader>
                        <CardContent>
                                <div className="text-sm text-muted-foreground">Amount</div>
                                <div className="text-2xl font-semibold">{formattedAmount}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                        Due on {new Date(summary.dueDate).toLocaleDateString(undefined, {
                                                month: "long",
                                                day: "numeric",
                                        })}
                                </div>
                                {summary.autopayEnabled && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                                Autopay is enabled for this unit.
                                        </div>
                                )}
                                <Link href="/payments" className="mt-4 inline-block">
                                        <Button size="sm">View details</Button>
                                </Link>
                        </CardContent>
                </Card>
        )
}
