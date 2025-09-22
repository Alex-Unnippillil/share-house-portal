import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRoommateUpdates } from "../data"

export async function RoommateBoardCard() {
        const updates = await getRoommateUpdates()

        return (
                <Card>
                        <CardHeader>
                                <CardTitle>Roommate board</CardTitle>
                        </CardHeader>
                        <CardContent>
                                <ul className="space-y-2 text-sm">
                                        {updates.map((update) => (
                                                <li key={update.id}>
                                                        <span className="font-medium">{update.author}</span>: {update.message}
                                                </li>
                                        ))}
                                </ul>
                                <Link href="/messaging" className="mt-4 inline-block">
                                        <Button variant="outline" size="sm">
                                                Go to messages
                                        </Button>
                                </Link>
                        </CardContent>
                </Card>
        )
}
