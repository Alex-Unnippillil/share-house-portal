import { getRentSummary } from "../data"
import { NextRentCardClient } from "./next-rent-card.client"

export async function NextRentCard() {
  const summary = await getRentSummary()
  return <NextRentCardClient summary={summary} />
}
