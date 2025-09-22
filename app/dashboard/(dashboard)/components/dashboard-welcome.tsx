import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getWelcomeMessage } from "../data"

export async function DashboardWelcome() {
        const message = await getWelcomeMessage()

        return (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-2xl font-bold tracking-tight">{message.title}</h2>
                        <div className="flex gap-2">
                                <Link href={message.ctaHref}>
                                        <Button size="sm">{message.ctaLabel}</Button>
                                </Link>
                        </div>
                </div>
        )
}
