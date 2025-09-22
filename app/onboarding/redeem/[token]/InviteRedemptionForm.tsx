"use client"

import { FormEvent, useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

import { useInviteContext } from "./InviteContext"
import { completeInviteRedemption } from "./actions"

const formatCurrency = (value: number | null, currency: string | null) => {
  if (value === null) {
    return null
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 0,
    }).format(value)
  } catch (error) {
    console.warn("Unable to format currency", error)
    return value.toString()
  }
}

export function InviteRedemptionForm() {
  const context = useInviteContext()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [rentShare, setRentShare] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [acceptPolicies, setAcceptPolicies] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [isPending, startTransition] = useTransition()

  const recommendedRentShare = useMemo(() => {
    const metadataValue = context.inviteMetadata?.rent_share_recommendation

    if (typeof metadataValue === "number") {
      return metadataValue
    }

    if (typeof metadataValue === "string") {
      const parsed = Number(metadataValue)
      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }

    if (typeof context.unit.rent === "number") {
      return Math.round(context.unit.rent / 2)
    }

    return null
  }, [context.inviteMetadata, context.unit.rent])

  const formattedRentShare = useMemo(
    () => formatCurrency(recommendedRentShare, context.unit.currency),
    [recommendedRentShare, context.unit.currency]
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const numericRentShare = rentShare.trim() ? Number(rentShare) : null
    const resolvedRentShare =
      numericRentShare !== null && !Number.isNaN(numericRentShare)
        ? numericRentShare
        : recommendedRentShare

    startTransition(() => {
      completeInviteRedemption({
        inviteToken: context.inviteToken,
        fullName: fullName.trim(),
        phone: phone.trim(),
        rentShare: resolvedRentShare ?? null,
        notes: formNotes.trim(),
        acceptPolicies,
      })
        .then((result) => {
          if (result.ok) {
            setStatus("success")
            toast({
              title: "Invite redeemed",
              description: result.message,
            })
          } else {
            setStatus("error")
            toast({
              title: "Unable to redeem invite",
              description: result.message,
              variant: "destructive",
            })
          }
        })
        .catch((error) => {
          console.error("Invite redemption failed", error)
          setStatus("error")
          toast({
            title: "Something went wrong",
            description: "Please try again in a moment.",
            variant: "destructive",
          })
        })
    })
  }

  const submitDisabled = isPending || !acceptPolicies || !fullName.trim()

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            value={fullName}
            autoComplete="name"
            placeholder="Jamie Lee"
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={phone}
            autoComplete="tel"
            placeholder="(555) 555-1234"
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={context.inviteeEmail} readOnly className="bg-muted" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rentShare">Monthly rent share</Label>
          <Input
            id="rentShare"
            name="rentShare"
            inputMode="decimal"
            value={rentShare}
            placeholder={formattedRentShare ?? ""}
            onChange={(event) => setRentShare(event.target.value)}
          />
          {formattedRentShare ? (
            <p className="text-xs text-muted-foreground">
              Recommended share based on invite details: {formattedRentShare}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Move-in notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formNotes}
          placeholder={context.notes ?? "Let the household know about your move-in preferences."}
          onChange={(event) => setFormNotes(event.target.value)}
          rows={4}
        />
      </div>

      <div className="flex items-start space-x-3 rounded-lg border border-border p-4">
        <Checkbox
          id="acceptPolicies"
          checked={acceptPolicies}
          onCheckedChange={(checked) => setAcceptPolicies(Boolean(checked))}
        />
        <Label htmlFor="acceptPolicies" className="cursor-pointer">
          I agree to the household policies and acknowledge the move-in details for {context.property.name}.
        </Label>
      </div>

      <Button type="submit" disabled={submitDisabled} className="w-full sm:w-auto">
        {isPending ? "Processing..." : "Join the household"}
      </Button>

      {status === "success" ? (
        <p className="text-sm text-green-600">
          You’re all set! We’ll notify the household lead that you’ve confirmed your spot.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-sm text-destructive">
          We couldn’t finalize the invite. Double-check the form and try again.
        </p>
      ) : null}
    </form>
  )
}
