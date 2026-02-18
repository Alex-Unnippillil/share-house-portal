"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import OnboardingProgress from "@/components/onboarding-progress"
import SmartLink from "@/components/navigation/SmartLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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

type SaveState = "idle" | "saving" | "saved"

type StepStatus = {
  id: number
  label: string
  complete: boolean
  locked?: boolean
}

const DRAFT_KEY = "onboarding-draft-v1"
const TOTAL_STEPS = 6

function getStepFromSearchParam(raw: string | null) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(Math.max(1, Math.floor(parsed)), TOTAL_STEPS)
}

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: "easeOut" },
}

export function OnboardingClient({ initialData }: OnboardingClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [pending, startTransition] = useTransition()
  const [stepSuccessMessage, setStepSuccessMessage] = useState("")
  const [stepErrorMessage, setStepErrorMessage] = useState("")

  const [unitId, setUnitId] = useState(initialData.profile.unitId)
  const [rentShare, setRentShare] = useState(initialData.profile.rentShare?.toString() ?? "")
  const [emergencyName, setEmergencyName] = useState(initialData.profile.emergencyContact?.name ?? "")
  const [emergencyPhone, setEmergencyPhone] = useState(initialData.profile.emergencyContact?.phone ?? "")
  const [emergencyRelationship, setEmergencyRelationship] = useState(initialData.profile.emergencyContact?.relationship ?? "")
  const [vehicleMake, setVehicleMake] = useState(initialData.profile.vehicleDetails?.make ?? "")
  const [vehicleModel, setVehicleModel] = useState(initialData.profile.vehicleDetails?.model ?? "")
  const [vehicleColor, setVehicleColor] = useState(initialData.profile.vehicleDetails?.color ?? "")
  const [vehiclePlate, setVehiclePlate] = useState(initialData.profile.vehicleDetails?.licensePlate ?? "")
  const [avatarUploaded, setAvatarUploaded] = useState(Boolean(initialData.profile.avatarSignedUrl))
  const [documentCount, setDocumentCount] = useState(initialData.profile.personalDocuments.length)

  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [, setSaveTick] = useState(0)
  const [resumedFromDraft, setResumedFromDraft] = useState(false)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)

  const currentStep = getStepFromSearchParam(searchParams.get("step"))

  useEffect(() => {
    const rawDraft = window.localStorage.getItem(DRAFT_KEY)
    if (!rawDraft) return

    try {
      const parsed = JSON.parse(rawDraft) as Record<string, string>
      setUnitId(parsed.unitId ?? initialData.profile.unitId)
      setRentShare(parsed.rentShare ?? initialData.profile.rentShare?.toString() ?? "")
      setEmergencyName(parsed.emergencyName ?? initialData.profile.emergencyContact?.name ?? "")
      setEmergencyPhone(parsed.emergencyPhone ?? initialData.profile.emergencyContact?.phone ?? "")
      setEmergencyRelationship(parsed.emergencyRelationship ?? initialData.profile.emergencyContact?.relationship ?? "")
      setVehicleMake(parsed.vehicleMake ?? initialData.profile.vehicleDetails?.make ?? "")
      setVehicleModel(parsed.vehicleModel ?? initialData.profile.vehicleDetails?.model ?? "")
      setVehicleColor(parsed.vehicleColor ?? initialData.profile.vehicleDetails?.color ?? "")
      setVehiclePlate(parsed.vehiclePlate ?? initialData.profile.vehicleDetails?.licensePlate ?? "")
      setResumedFromDraft(true)
    } catch {
      window.localStorage.removeItem(DRAFT_KEY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSaveState("saving")
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          unitId,
          rentShare,
          emergencyName,
          emergencyPhone,
          emergencyRelationship,
          vehicleMake,
          vehicleModel,
          vehicleColor,
          vehiclePlate,
        }),
      )
      setLastSavedAt(new Date())
      setSaveState("saved")
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [unitId, rentShare, emergencyName, emergencyPhone, emergencyRelationship, vehicleMake, vehicleModel, vehicleColor, vehiclePlate])

  useEffect(() => {
    const interval = window.setInterval(() => setSaveTick((value) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const steps: StepStatus[] = useMemo(
    () => [
      { id: 1, label: "Profile", complete: avatarUploaded },
      { id: 2, label: "Unit", complete: Boolean(unitId.trim()) },
      { id: 3, label: "Rent", complete: Number(rentShare) > 0 },
      { id: 4, label: "Emergency", complete: Boolean(emergencyName && emergencyPhone && emergencyRelationship) },
      { id: 5, label: "Vehicle", complete: Boolean(vehicleMake && vehicleModel && vehicleColor && vehiclePlate) },
      { id: 6, label: "Review", complete: reviewConfirmed },
    ],
    [
      avatarUploaded,
      unitId,
      rentShare,
      emergencyName,
      emergencyPhone,
      emergencyRelationship,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      vehiclePlate,
      reviewConfirmed,
    ],
  )

  const furthestAvailableStep = useMemo(() => {
    const firstIncomplete = steps.find((step) => !step.complete)
    if (!firstIncomplete) return TOTAL_STEPS
    return firstIncomplete.id
  }, [steps])

  const gatedSteps = useMemo(
    () => steps.map((step) => ({ ...step, locked: step.id > furthestAvailableStep + 1 })),
    [furthestAvailableStep, steps],
  )

  useEffect(() => {
    if (currentStep > furthestAvailableStep + 1) {
      router.replace(`/onboarding?step=${furthestAvailableStep + 1}`)
      setStepErrorMessage("Please complete earlier steps before jumping ahead.")
    }
  }, [currentStep, furthestAvailableStep, router])

  const relativeSavedLabel = (() => {
    if (!lastSavedAt) return "Not saved yet"
    const secondsAgo = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)
    if (secondsAgo < 5) return "Saved just now"
    if (secondsAgo < 60) return `Saved ${secondsAgo}s ago`
    return `Saved ${Math.floor(secondsAgo / 60)}m ago`
  })()

  function goToStep(step: number) {
    router.replace(`/onboarding?step=${step}`, { scroll: true })
  }

  function validateStep(step: number): string | null {
    if (step === 1 && !avatarUploaded) return "Upload an avatar before continuing."
    if (step === 2 && !unitId.trim()) return "Unit assignment is required."
    if (step === 3) {
      const parsed = Number(rentShare)
      if (!Number.isFinite(parsed) || parsed <= 0) return "Rent share must be a number greater than 0."
    }
    if (step === 4) {
      if (!emergencyName.trim() || !emergencyPhone.trim() || !emergencyRelationship.trim()) {
        return "All emergency contact fields are required."
      }
    }
    if (step === 5) {
      if (!vehicleMake.trim() || !vehicleModel.trim() || !vehicleColor.trim() || !vehiclePlate.trim()) {
        return "All vehicle detail fields are required."
      }
    }
    if (step === 6 && !reviewConfirmed) return "Please confirm all fields before completing onboarding."
    return null
  }

  async function saveStep(step: number) {
    if (step === 2) return saveUnitAssignment({ unitId })
    if (step === 3) return saveRentShare({ rentShare: Number(rentShare) })
    if (step === 4) return saveEmergencyContact({ name: emergencyName, phone: emergencyPhone, relationship: emergencyRelationship })
    if (step === 5) {
      return saveVehicleDetails({ make: vehicleMake, model: vehicleModel, color: vehicleColor, licensePlate: vehiclePlate })
    }
    return { ok: true, message: "Step complete." }
  }

  function handleNext() {
    setStepErrorMessage("")
    setStepSuccessMessage("")

    const error = validateStep(currentStep)
    if (error) {
      setStepErrorMessage(error)
      return
    }

    startTransition(async () => {
      const response = await saveStep(currentStep)
      if (!response.ok) {
        setStepErrorMessage(response.message)
        return
      }

      setStepSuccessMessage(currentStep === 6 ? "All information confirmed. Onboarding complete." : `${response.message} Step validated.`)
      if (currentStep < TOTAL_STEPS) {
        goToStep(currentStep + 1)
      } else {
        window.localStorage.removeItem(DRAFT_KEY)
      }
    })
  }

  const completionPercent = Math.round((steps.filter((step) => step.complete).length / steps.length) * 100)

  return (
    <div className="mx-auto w-full max-w-5xl pb-12">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl">Finish your onboarding</CardTitle>
                <Badge variant={completionPercent === 100 ? "default" : "secondary"}>{completionPercent}%</Badge>
              </div>
              <CardDescription>
                Complete each step to unlock resident messaging, bookings, and payment automation.
              </CardDescription>
              <Progress value={completionPercent} />
              <OnboardingProgress steps={gatedSteps} />
            </CardHeader>
          </Card>

          <AnimatePresence initial={false} mode="wait">
            {currentStep === 1 ? (
              <motion.div key="step-1" {...panelMotion}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Step 1 · Profile & assets</CardTitle>
                    <CardDescription>Upload your profile image and supporting lease documents.</CardDescription>
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
                        startTransition(async () => {
                          const response = await uploadOnboardingAsset(formData)
                          if (response.ok) {
                            setAvatarUploaded(true)
                            setStepSuccessMessage("Avatar uploaded successfully.")
                            setStepErrorMessage("")
                            return
                          }

                          setStepErrorMessage(response.message)
                        })
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
                        startTransition(async () => {
                          const response = await uploadOnboardingAsset(formData)
                          if (response.ok) {
                            setDocumentCount((value) => value + 1)
                            setStepSuccessMessage("Document uploaded successfully.")
                            setStepErrorMessage("")
                            return
                          }

                          setStepErrorMessage(response.message)
                        })
                      }}
                    >
                      <Label htmlFor="document">Upload personal document</Label>
                      <Input id="document" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
                      <Button type="submit" size="sm" variant="outline" disabled={pending}>Upload document</Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}

            {currentStep === 2 ? (
              <motion.div key="step-2" {...panelMotion}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Step 2 · Unit assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Label htmlFor="unit-id">Unit ID</Label>
                    <Input id="unit-id" value={unitId} onChange={(event) => setUnitId(event.target.value)} placeholder="B-402" />
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}

            {currentStep === 3 ? (
              <motion.div key="step-3" {...panelMotion}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Step 3 · Rent share</CardTitle>
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
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}

            {currentStep === 4 ? (
              <motion.div key="step-4" {...panelMotion}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Step 4 · Emergency contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <Input value={emergencyName} onChange={(event) => setEmergencyName(event.target.value)} placeholder="Contact name" />
                    <Input value={emergencyPhone} onChange={(event) => setEmergencyPhone(event.target.value)} placeholder="Phone number" />
                    <Input
                      value={emergencyRelationship}
                      onChange={(event) => setEmergencyRelationship(event.target.value)}
                      placeholder="Relationship"
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}

            {currentStep === 5 ? (
              <motion.div key="step-5" {...panelMotion}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Step 5 · Vehicle details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <Input value={vehicleMake} onChange={(event) => setVehicleMake(event.target.value)} placeholder="Make" />
                    <Input value={vehicleModel} onChange={(event) => setVehicleModel(event.target.value)} placeholder="Model" />
                    <Input value={vehicleColor} onChange={(event) => setVehicleColor(event.target.value)} placeholder="Color" />
                    <Input value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value)} placeholder="License plate" />
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}

            {currentStep === 6 ? (
              <motion.div key="step-6" {...panelMotion}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Final review</CardTitle>
                    <CardDescription>Confirm all submitted fields before completing onboarding.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid gap-2 rounded-md border p-3">
                      <p><span className="font-medium">Email:</span> {initialData.user.email}</p>
                      <p><span className="font-medium">Unit:</span> {unitId || "Not provided"}</p>
                      <p><span className="font-medium">Rent share:</span> {rentShare || "Not provided"}%</p>
                      <p><span className="font-medium">Emergency contact:</span> {emergencyName || "-"} / {emergencyPhone || "-"} ({emergencyRelationship || "-"})</p>
                      <p><span className="font-medium">Vehicle:</span> {vehicleMake || "-"} {vehicleModel || ""}, {vehicleColor || "-"}, {vehiclePlate || "-"}</p>
                      <p><span className="font-medium">Documents uploaded:</span> {documentCount}</p>
                    </div>
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox checked={reviewConfirmed} onCheckedChange={(checked) => setReviewConfirmed(Boolean(checked))} />
                      <span>I confirm the above information is accurate and ready for submission.</span>
                    </label>
                    {reviewConfirmed ? (
                      <SmartLink href="/dashboard" intent="navigation" className="inline-block text-sm text-primary underline">
                        Continue to dashboard
                      </SmartLink>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={currentStep === 1 || pending} onClick={() => goToStep(currentStep - 1)}>
              Back
            </Button>
            <Button disabled={pending} onClick={handleNext}>
              {currentStep === TOTAL_STEPS ? "Finish onboarding" : "Save and continue"}
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {stepErrorMessage ? (
              <motion.p
                key="step-error"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-sm text-destructive"
              >
                {stepErrorMessage}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {stepSuccessMessage ? (
              <motion.p
                key="step-success"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-sm text-emerald-600 dark:text-emerald-400"
              >
                {stepSuccessMessage}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <aside className="sticky top-4 order-first rounded-lg border bg-card p-4 text-sm shadow-sm lg:order-none">
          <p className="font-semibold">Progress summary</p>
          <p className="mt-1 text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>Avatar uploaded: {avatarUploaded ? "Yes" : "No"}</li>
            <li>Unit set: {unitId ? "Yes" : "No"}</li>
            <li>Rent share set: {Number(rentShare) > 0 ? "Yes" : "No"}</li>
            <li>Emergency contact set: {emergencyName && emergencyPhone && emergencyRelationship ? "Yes" : "No"}</li>
            <li>Vehicle set: {vehicleMake && vehicleModel && vehicleColor && vehiclePlate ? "Yes" : "No"}</li>
            <li>Documents uploaded: {documentCount}</li>
          </ul>
          <motion.p
            className="mt-3 text-xs text-muted-foreground"
            animate={saveState === "saving" ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
            transition={saveState === "saving" ? { repeat: Infinity, duration: 0.9 } : { duration: 0.2 }}
          >
            {saveState === "saving" ? "Saving draft…" : relativeSavedLabel}
          </motion.p>
          {resumedFromDraft ? <p className="mt-1 text-xs text-primary">Resumed from your last saved draft.</p> : null}
        </aside>
      </div>
    </div>
  )
}
