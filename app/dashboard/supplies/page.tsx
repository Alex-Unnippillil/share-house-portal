import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  calculatePurchaseShares,
  type HouseholdMembershipRow,
  type HouseholdRow,
  type SupplyPurchaseRow,
} from "@/lib/supply-ledger"

const sampleTimestamp = "2024-06-01T00:00:00.000Z"

const household: HouseholdRow = {
  id: "household-1",
  name: "Maple Street Flat",
  default_split: "weighted",
  created_at: sampleTimestamp,
  updated_at: sampleTimestamp,
}

const householdMembers: HouseholdMembershipRow[] = [
  {
    id: "membership-1",
    household_id: household.id,
    profile_id: "profile-1",
    weighting_factor: 1.4,
    role: "primary tenant",
    created_at: sampleTimestamp,
    updated_at: sampleTimestamp,
  },
  {
    id: "membership-2",
    household_id: household.id,
    profile_id: "profile-2",
    weighting_factor: 1,
    role: "roommate",
    created_at: sampleTimestamp,
    updated_at: sampleTimestamp,
  },
  {
    id: "membership-3",
    household_id: household.id,
    profile_id: "profile-3",
    weighting_factor: 0.8,
    role: "roommate",
    created_at: sampleTimestamp,
    updated_at: sampleTimestamp,
  },
]

const memberDirectory: Record<string, { name: string; note?: string }> = {
  "profile-1": { name: "Amelia Chen", note: "Largest bedroom" },
  "profile-2": { name: "Jasper Patel", note: "Medium bedroom" },
  "profile-3": { name: "Noah Rivera", note: "Cozy bedroom" },
}

const purchases: SupplyPurchaseRow[] = [
  {
    id: "purchase-1",
    household_id: household.id,
    purchaser_id: "profile-1",
    description: "Household cleaning supplies",
    total_cost: 48.75,
    purchased_at: "2024-06-15T15:30:00.000Z",
    default_split: "weighted",
    created_at: "2024-06-15T15:30:00.000Z",
    updated_at: "2024-06-15T15:30:00.000Z",
  },
  {
    id: "purchase-2",
    household_id: household.id,
    purchaser_id: "profile-2",
    description: "Bulk paper goods",
    total_cost: 36,
    purchased_at: "2024-06-28T10:00:00.000Z",
    default_split: "even",
    created_at: "2024-06-28T10:00:00.000Z",
    updated_at: "2024-06-28T10:00:00.000Z",
  },
]

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export default function SupplyLedgerPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supply ledger</h1>
          <p className="text-muted-foreground">
            Track how shared supply purchases are split across the household. Weighted splits honour each
            roommate&apos;s room size when applicable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Household default split: <strong>{formatMode(household.default_split)}</strong>
          </span>
          <Badge variant="secondary">Weights derived from room sizes</Badge>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        {purchases.map((purchase) => {
          const calculation = calculatePurchaseShares(purchase, householdMembers)
          const purchaser = memberDirectory[purchase.purchaser_id]
          const purchaseDate = dateFormatter.format(new Date(purchase.purchased_at))

          return (
            <Card key={purchase.id} className="flex flex-col">
              <CardHeader className="gap-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle>{purchase.description}</CardTitle>
                    <CardDescription>
                      Bought by {purchaser?.name ?? "Unknown member"} on {purchaseDate}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{currencyFormatter.format(calculation.total)}</Badge>
                    <Badge variant={calculation.mode === "weighted" ? "default" : "secondary"}>
                      {formatMode(calculation.mode)} split
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {calculation.shares.map((share) => {
                    const member = memberDirectory[share.profileId]
                    const percentLabel = `${Math.round(share.percentage * 100)}%`

                    return (
                      <div
                        key={share.membershipId}
                        className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-medium leading-none">
                            {member?.name ?? "Unknown member"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member?.note ?? "Shared amenities"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {calculation.mode === "weighted" ? (
                            <Badge variant="secondary">
                              Weight {share.weightingFactor.toFixed(1)}
                            </Badge>
                          ) : null}
                          <span className="text-sm text-muted-foreground">{percentLabel}</span>
                          <span className="text-base font-semibold">
                            {currencyFormatter.format(share.amount)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </div>
  )
}

function formatMode(mode: SupplyPurchaseRow["default_split"]) {
  return mode === "weighted" ? "Weighted" : "Even"
}
