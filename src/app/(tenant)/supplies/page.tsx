import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/utils/supabase/server'

import { AddSupplyItemForm } from './_components/add-supply-item-form'
import { RecentPurchases } from './_components/recent-purchases'
import { ShoppingList } from './_components/shopping-list'
import type { SupplyListEntry, SupplyListItem, SupplyPurchase } from './types'

export const metadata: Metadata = {
  title: 'Shared supplies',
  description: 'Coordinate shared household purchases, track last restock dates, and keep everyone on the same page.',
}

function normalisePurchases(
  rows: Array<Record<string, any>>,
  fallbackUnitId: string
): SupplyPurchase[] {
  return rows
    .map(row => {
      const totalCostRaw = row.total_cost
      let totalCost: number | null = null
      if (typeof totalCostRaw === 'number') {
        totalCost = totalCostRaw
      } else if (typeof totalCostRaw === 'string' && totalCostRaw.trim().length) {
        const parsed = Number(totalCostRaw)
        totalCost = Number.isFinite(parsed) ? parsed : null
      }

      const purchaserName =
        row.purchaser?.full_name ?? row.purchaser_name ?? row.profiles?.full_name ?? null

      const quantityRaw = row.quantity ?? row.item_quantity ?? null
      const quantity = quantityRaw != null ? String(quantityRaw) : null

      if (!row.purchased_at) {
        return null
      }

      return {
        id: row.id as string,
        itemId: (row.item_id as string | null) ?? null,
        itemName: (row.item_name as string | null) ?? (row.item?.name as string | null) ?? 'Household item',
        purchasedAt: row.purchased_at as string,
        purchasedBy: (row.purchased_by as string | null) ?? null,
        purchaserName,
        quantity,
        totalCost,
        notes: (row.notes as string | null) ?? null,
        unitId: (row.unit_id as string | null) ?? fallbackUnitId,
      }
    })
    .filter((value): value is SupplyPurchase => Boolean(value && value.purchasedAt))
}

function normaliseShoppingList(
  rows: Array<Record<string, any>>,
  lastPurchaseById: Map<string, SupplyPurchase>,
  lastPurchaseByName: Map<string, SupplyPurchase>
): SupplyListEntry[] {
  return rows.map(row => {
    const quantityRaw = row.quantity

    const item: SupplyListItem = {
      id: row.id as string,
      name: (row.name as string | null) ?? 'Untitled item',
      category: (row.category as string | null) ?? null,
      quantity: quantityRaw != null ? String(quantityRaw) : null,
      notes: (row.notes as string | null) ?? null,
      status: (row.status as string | null) ?? 'needed',
      neededBy: (row.needed_by as string | null) ?? null,
      lastPurchasedAt: (row.last_purchased_at as string | null) ?? null,
      unitId: (row.unit_id as string | null) ?? '',
      createdAt: (row.created_at as string | null) ?? new Date().toISOString(),
      updatedAt: (row.updated_at as string | null) ?? null,
    }

    const byId = lastPurchaseById.get(item.id)
    const byName = lastPurchaseByName.get(item.name.toLowerCase())

    return {
      ...item,
      lastPurchase: byId ?? byName ?? null,
    }
  })
}

export default async function TenantSuppliesPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, unit_id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Unable to load profile for supplies page', profileError)
  }

  const profile = (profileData ?? null) as { id: string; unit_id: string | null; full_name: string | null } | null

  if (!profile?.unit_id) {
    return (
      <div className="container max-w-3xl space-y-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Set up your household</CardTitle>
            <CardDescription>
              We need to know which unit you belong to before showing shared supplies. Update your profile with a unit
              assignment to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Visit the account settings page to confirm your household details and invite your roommates once everything is
            in place.
          </CardContent>
        </Card>
      </div>
    )
  }

  const unitId = profile.unit_id

  const [itemsResponse, purchasesResponse] = await Promise.all([
    supabase
      .from('household_supply_items')
      .select('id, name, category, quantity, notes, status, needed_by, last_purchased_at, unit_id, created_at, updated_at')
      .eq('unit_id', unitId)
      .eq('status', 'needed')
      .order('created_at', { ascending: true }),
    supabase
      .from('household_supply_purchases')
      .select(
        `id, item_id, item_name, purchased_at, purchased_by, quantity, total_cost, notes, unit_id, purchaser:profiles(full_name)`
      )
      .eq('unit_id', unitId)
      .order('purchased_at', { ascending: false })
      .limit(20),
  ])

  const errors: string[] = []

  if (itemsResponse.error) {
    console.error('Failed to fetch household supply list', itemsResponse.error)
    errors.push('We could not load the latest shopping list.')
  }

  if (purchasesResponse.error) {
    console.error('Failed to fetch household supply purchases', purchasesResponse.error)
    errors.push('We could not load recent purchases.')
  }

  const purchases = normalisePurchases(purchasesResponse.data ?? [], unitId)

  const lastPurchaseById = new Map<string, SupplyPurchase>()
  const lastPurchaseByName = new Map<string, SupplyPurchase>()

  for (const purchase of purchases) {
    if (purchase.itemId && !lastPurchaseById.has(purchase.itemId)) {
      lastPurchaseById.set(purchase.itemId, purchase)
    }

    const normalisedName = purchase.itemName?.toLowerCase?.()
    if (normalisedName && !lastPurchaseByName.has(normalisedName)) {
      lastPurchaseByName.set(normalisedName, purchase)
    }
  }

  const shoppingList = normaliseShoppingList(itemsResponse.data ?? [], lastPurchaseById, lastPurchaseByName)

  return (
    <div className="container max-w-6xl space-y-8 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Shared supplies</h1>
        <p className="text-base text-muted-foreground">
          Keep track of staples, coordinate shopping runs, and record reimbursements in one place for your household.
        </p>
      </header>

      {errors.length ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {errors.map(message => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <Tabs defaultValue="list" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="list">Shopping list ({shoppingList.length})</TabsTrigger>
            <TabsTrigger value="purchases">Recent purchases ({purchases.length})</TabsTrigger>
          </TabsList>
          <AddSupplyItemForm />
        </div>

        <TabsContent value="list">
          <ShoppingList items={shoppingList} />
        </TabsContent>

        <TabsContent value="purchases">
          <RecentPurchases purchases={purchases} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
