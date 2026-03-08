export interface LedgerShare {
  roommateId: string
  roommateName: string
  amount: number
}

export interface LedgerPayer {
  id: string
  name: string
}

export interface SharedLedgerPurchase {
  id: string
  description: string
  category: string
  merchant: string
  purchasedAt: string
  paidBy: LedgerPayer
  totalAmount: number
  currency: string
  note?: string
  shares: LedgerShare[]
}
