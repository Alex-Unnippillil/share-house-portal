"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { toast } from "sonner"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { sharePaymentReceipt } from "@/lib/share/outbound"
import type { PaymentReceiptHistoryEntry } from "@/types/payments"

interface ShareReceiptButtonProps {
  receipt: PaymentReceiptHistoryEntry
}

export function ShareReceiptButton({ receipt }: ShareReceiptButtonProps) {
  const [pending, setPending] = useState(false)

  const handleShare = async () => {
    setPending(true)
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : undefined
      const status = await sharePaymentReceipt(receipt, { baseUrl })

      if (status === "shared") {
        toast.success("Receipt shared")
      } else if (status === "copied") {
        toast.success("Receipt link copied to clipboard")
      } else if (status === "unsupported") {
        toast.error("Sharing is not supported on this device")
      }
    } catch (error) {
      console.error("Failed to share receipt", error)
      toast.error("Unable to share receipt")
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={pending}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full justify-center gap-1")}
    >
      <Share2 className="size-4" aria-hidden />
      <span>{pending ? "Sharing…" : "Share"}</span>
    </button>
  )
}
