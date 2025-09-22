export interface SupplyListItem {
  id: string
  name: string
  category: string | null
  quantity: string | null
  notes: string | null
  status: string
  neededBy: string | null
  lastPurchasedAt: string | null
  unitId: string
  createdAt: string
  updatedAt: string | null
}

export interface SupplyPurchase {
  id: string
  itemId: string | null
  itemName: string
  purchasedAt: string
  purchasedBy: string | null
  purchaserName: string | null
  quantity: string | null
  totalCost: number | null
  notes: string | null
  unitId: string
}

export interface SupplyListEntry extends SupplyListItem {
  lastPurchase?: SupplyPurchase | null
}

export interface ActionResult {
  success: boolean
  message?: string
  error?: string
}
