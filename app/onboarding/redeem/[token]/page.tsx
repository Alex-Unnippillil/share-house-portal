import type { Metadata } from "next"

import InviteRedemptionContent from "./InviteRedemptionContent"
import { loadInviteContext } from "./loader"

type InviteRedemptionPageProps = {
  params: { token: string }
}

export const metadata: Metadata = {
  title: "Redeem your Roomsily invite",
  description: "Confirm your details to join your household portal.",
}

export default async function InviteRedemptionPage({ params }: InviteRedemptionPageProps) {
  const context = await loadInviteContext(params.token)

  return <InviteRedemptionContent context={context} />
}
