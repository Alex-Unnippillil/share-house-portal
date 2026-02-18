"use client"

import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import SmartLink from "@/components/navigation/SmartLink"
import {
  saveEmergencyContact,
  saveRentShare,
  saveUnitAssignment,
  saveVehicleDetails,
  uploadOnboardingAsset,
} from "./actions"

type OnboardingClientProps = {
  initialData: {
    user: { id: string; email: string }
    profile: {
      unitId: string
      rentShare?: number
      avatarSignedUrl: string | null
      emergencyContact?: { name?: string; phone?: string; relationship?: string }
      vehicleDetails?: { make?: string; model?: string; color?: string; licensePlate?: string }
      completion: { completionPercent: number; completedSteps: string[]; isComplete: boolean }
      personalDocuments: Array<{ name: string; uploadedAt: string; signedUrl: string | null }>
    }
  }
}

export function OnboardingClient({ initialData }: OnboardingClientProps) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string>("")

  const [unitId, setUnitId] = useState(initialData.profile.unitId)
  const [rentShare, setRentShare] = useState(initialData.profile.rentShare?.toString() ?? "")
  const [emergencyName, setEmergencyName] = useState(initialData.profile.emergencyContact?.name ?? "")
  const [emergencyPhone, setEmergencyPhone] = useState(initialData.profile.emergencyContact?.phone ?? "")
  const [emergencyRelationship, setEmergencyRelationship] = useState(initialData.profile.emergencyContact?.relationship ?? "")
  const [vehicleMake, setVehicleMake] = useState(initialData.profile.vehicleDetails?.make ?? "")
  const [vehicleModel, setVehicleModel] = useState(initialData.profile.vehicleDetails?.model ?? "")
  const [vehicleColor, setVehicleColor] = useState(initialData.profile.vehicleDetails?.color ?? "")
  const [vehiclePlate, setVehiclePlate] = useState(initialData.profile.vehicleDetails?.licensePlate ?? "")

  const completion = initialData.profile.completion

  const heading = useMemo(
    () => (completion.isComplete ? "Onboarding completed" : "Finish your onboarding"),
    [completion.isComplete],
  )

  function runAction(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const response = await action()
      setMessage(response.message)
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-10">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl">{heading}</CardTitle>
            <Badge variant={completion.isComplete ? "default" : "secondary"}>{completion.completionPercent}%</Badge>
          </div>
          <CardDescription>
            Complete each section so tenants, roommates, and property managers can coordinate payments, visitor requests, maintenance access, and emergency response.
          </CardDescription>
          <Progress value={completion.completionPercent} aria-label="Onboarding completion progress" />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile photo & resident documents</CardTitle>
          <CardDescription>Uploads stay in private storage and are used for lease verification, compliance records, and account recovery.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialData.profile.avatarSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={initialData.profile.avatarSignedUrl} alt="Current avatar" className="size-16 rounded-full object-cover" />
          ) : null}
          <form
            className="space-y-2"
            action={(formData) => {
              formData.set("kind", "avatar")
              runAction(() => uploadOnboardingAsset(formData))
            }}
          >
            <Label htmlFor="avatar">Upload avatar</Label>
            <Input id="avatar" name="file" type="file" accept="image/*" required />
            <Button type="submit" size="sm" disabled={pending}>Upload avatar</Button>
          </form>

          <form
            className="space-y-2"
            action={(formData) => {
              formData.set("kind", "document")
              runAction(() => uploadOnboardingAsset(formData))
            }}
          >
            <Label htmlFor="document">Upload resident document</Label>
            <Input id="document" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>Upload document</Button>
          </form>

          {initialData.profile.personalDocuments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent uploads</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {initialData.profile.personalDocuments.map((document) => (
                  <li key={`${document.name}-${document.uploadedAt}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{document.name}</span>
                    {document.signedUrl ? (
                      <SmartLink href={document.signedUrl} className="text-primary underline" intent="navigation">
                        Open
                      </SmartLink>
                    ) : (
                      <span>Unavailable</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1 · Unit assignment</CardTitle>
          <CardDescription>Use your lease unit identifier (for example: B-402).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="unit-id">Unit ID</Label>
          <Input id="unit-id" value={unitId} onChange={(event) => setUnitId(event.target.value)} placeholder="B-402" />
          <Button disabled={pending} onClick={() => runAction(() => saveUnitAssignment({ unitId }))}>Save unit assignment</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 2 · Rent share</CardTitle>
          <CardDescription>Add your share as a percentage so recurring Stripe rent reminders and receipts stay accurate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="rent-share">Rent share (%)</Label>
          <Input
            id="rent-share"
            inputMode="decimal"
            value={rentShare}
            onChange={(event) => setRentShare(event.target.value)}
            placeholder="25"
          />
          <Button
            disabled={pending}
            onClick={() => runAction(() => saveRentShare({ rentShare: Number(rentShare) }))}
          >
            Save rent share
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 3 · Emergency contacts</CardTitle>
          <CardDescription>Required for urgent incidents, overnight visitor policy exceptions, and after-hours property escalation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Input value={emergencyName} onChange={(event) => setEmergencyName(event.target.value)} placeholder="Contact name" />
          <Input value={emergencyPhone} onChange={(event) => setEmergencyPhone(event.target.value)} placeholder="Phone number (call/text)" />
          <Input
            id="emergency-relationship"
            value={emergencyRelationship}
            onChange={(event) => setEmergencyRelationship(event.target.value)}
            placeholder="Relationship to tenant/roommate"
          />
          <Button
            disabled={pending}
            onClick={() =>
              runAction(() =>
                saveEmergencyContact({
                  name: emergencyName,
                  phone: emergencyPhone,
                  relationship: emergencyRelationship,
                }),
              )
            }
          >
            Save emergency contact
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 4 · Vehicle details</CardTitle>
          <CardDescription>Used for parking reservations and to validate guest vehicles under overnight visitor limits.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Input value={vehicleMake} onChange={(event) => setVehicleMake(event.target.value)} placeholder="Make" />
          <Input value={vehicleModel} onChange={(event) => setVehicleModel(event.target.value)} placeholder="Model" />
          <Input value={vehicleColor} onChange={(event) => setVehicleColor(event.target.value)} placeholder="Color" />
          <Input value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value)} placeholder="License plate (required for parking)" />
          <Button
            disabled={pending}
            onClick={() =>
              runAction(() =>
                saveVehicleDetails({
                  make: vehicleMake,
                  model: vehicleModel,
                  color: vehicleColor,
                  licensePlate: vehiclePlate,
                }),
              )
            }
          >
            Save vehicle details
          </Button>
        </CardContent>
      </Card>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {pending ? "Saving onboarding details" : message}
      </p>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  )
}
