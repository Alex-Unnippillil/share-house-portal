import type { Metadata } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Database } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { createSupbaseServerClient } from "@/utils/supaone"

import ToBuyList from "./components/to-buy-list"

export const metadata: Metadata = {
  title: "Household supplies",
  description: "Track shared household purchases and keep the pantry stocked.",
}

type ToBuyItem = Database["public"]["Tables"]["to_buy_items"]["Row"]

export default async function SuppliesPage() {
  const supabase = await createSupbaseServerClient()
  const { data, error } = await supabase
    .from("to_buy_items")
    .select("id, created_at, name, notes, quantity, supply_item_id, fulfilled_at")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Failed to load to-buy items", error.message)
  }

  const items: ToBuyItem[] = data ?? []

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Household supplies</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Keep track of the shared shopping list, mark items as purchased, and reopen anything that still
          needs attention.
        </p>
      </header>
      <Card className={cn("border-dashed", items.length === 0 && "border-muted-foreground/40") }>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Shared to-buy list</CardTitle>
          <CardDescription>
            Item status updates instantly thanks to Supabase realtime events triggered by purchases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToBuyList initialItems={items} />
        </CardContent>
      </Card>
    </section>
  )
}
