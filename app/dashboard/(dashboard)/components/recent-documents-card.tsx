import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRecentDocuments } from "../data"

export async function RecentDocumentsCard() {
        const documents = await getRecentDocuments()

        return (
                <Card>
                        <CardHeader>
                                <CardTitle>Latest documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                                <ul className="space-y-2 text-sm">
                                        {documents.map((document) => (
                                                <li key={document.name}>{document.name}</li>
                                        ))}
                                </ul>
                                <Link href="/documents" className="mt-4 inline-block">
                                        <Button variant="outline" size="sm">
                                                Open
                                        </Button>
                                </Link>
                        </CardContent>
                </Card>
        )
}
