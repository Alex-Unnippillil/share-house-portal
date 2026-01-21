import { Metadata } from "next"
import { redirect } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import { ChecklistProgress } from "@/components/onboarding/ChecklistProgress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/payments/currency"
import type { Tables } from "@/lib/supabase"
import { createClient } from "@/utils/supabase/server"
import {
  ONBOARDING_STEPS,
  collectEmergencyContacts,
  deriveStepStateFromProfile,
  type EmergencyContact,
  type OnboardingStepKey,
} from "./progress"
import {
  completeUnitAssignment,
  saveEmergencyContact,
  updateRentShare,
} from "./actions"

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Roomsily household onboarding",
}

const RENT_CURRENCY = "USD"

type ProfileRow = Tables<"profiles">

type StepDefinition = (typeof ONBOARDING_STEPS)[number]

function formatRentShare(amount: number | null | undefined): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "Not provided"
  }

  return formatCurrency(amount, RENT_CURRENCY)
}

export default async function OnboardingPage() {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("Failed to load authenticated user", authError)
  }

  if (!user) {
    redirect("/auth")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "full_name, unit_id, rent_share, onboarding_steps, emergency_contacts, metadata",
    )
    .eq("id", user.id)
    .single<ProfileRow>()

  if (profileError) {
    console.error("Failed to load onboarding profile", profileError)
  }

  const profileData = profile ?? null
  const stepState = deriveStepStateFromProfile(profileData)
  const steps: Array<StepDefinition & { completed: boolean }> = ONBOARDING_STEPS.map(
    (definition) => ({
      ...definition,
      completed: stepState[definition.key],
    }),
  )
  const nextIncompleteStep = steps.find((step) => !step.completed)
  const completedSteps = steps.filter((step) => step.completed)
  const emergencyContacts = collectEmergencyContacts(profileData)
  const primaryContact = emergencyContacts[0]

  return (
    <div className="container mx-auto max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Finish setting up your home</h1>
        <p className="text-muted-foreground">
          Complete these onboarding tasks so your roommates, property manager, and concierge team have the
          information they need.
        </p>
      </header>

      <ChecklistProgress />

      {nextIncompleteStep ? (
        <ActiveStepCard
          stepKey={nextIncompleteStep.key}
          profile={profileData}
          defaultContact={primaryContact}
        />
      ) : (
        <CompletionCard />
      )}

      {completedSteps.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Completed tasks</h2>
            <p className="text-sm text-muted-foreground">
              Review what you&apos;ve shared so far. You can submit an updated response if anything changes.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {completedSteps.map((step) => (
              <CompletedStepCard
                key={step.key}
                stepKey={step.key}
                profile={profileData}
                contacts={emergencyContacts}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ActiveStepCard({
  stepKey,
  profile,
  defaultContact,
}: {
  stepKey: OnboardingStepKey
  profile: ProfileRow | null
  defaultContact?: EmergencyContact
}) {
  switch (stepKey) {
    case "unit_assignment":
      return <UnitAssignmentCard defaultUnitId={profile?.unit_id ?? ""} />
    case "rent_share":
      return <RentShareCard rentShare={profile?.rent_share ?? null} />
    case "emergency_contacts":
      return <EmergencyContactCard contact={defaultContact} />
    default:
      return null
  }
}

function UnitAssignmentCard({ defaultUnitId }: { defaultUnitId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Which unit are you moving into?</CardTitle>
        <CardDescription>
          We&apos;ll connect you with the right roommates, documents, and amenity schedules based on your unit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={completeUnitAssignment} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unit_id">Unit number</Label>
            <Input
              id="unit_id"
              name="unit_id"
              defaultValue={defaultUnitId}
              placeholder="e.g. Unit 4B"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button type="submit">Save unit</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function RentShareCard({ rentShare }: { rentShare: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What&apos;s your share of the monthly rent?</CardTitle>
        <CardDescription>
          This keeps auto-payments aligned and lets roommates understand how the household splits rent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateRentShare} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rent_share">Monthly rent share</Label>
            <Input
              id="rent_share"
              name="rent_share"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 975"
              defaultValue={typeof rentShare === "number" ? rentShare : ""}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the amount you&apos;re responsible for before utilities or add-ons.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button type="submit">Save rent share</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function EmergencyContactCard({ contact }: { contact?: EmergencyContact }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Who should we contact in an emergency?</CardTitle>
        <CardDescription>
          We&apos;ll only reach out to this person if there&apos;s an urgent situation affecting you or your unit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveEmergencyContact} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Full name</Label>
              <Input
                id="contact_name"
                name="contact_name"
                defaultValue={contact?.name ?? ""}
                placeholder="Jamie Rivera"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone number</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                defaultValue={contact?.phone ?? ""}
                placeholder="(555) 123-4567"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_relationship">Relationship (optional)</Label>
            <Input
              id="contact_relationship"
              name="contact_relationship"
              defaultValue={contact?.relationship ?? ""}
              placeholder="Parent, partner, roommate"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_notes">Notes (optional)</Label>
            <Textarea
              id="contact_notes"
              name="contact_notes"
              defaultValue={contact?.notes ?? ""}
              placeholder="Add any context that helps us reach them quickly"
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button type="submit">Save emergency contact</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function CompletionCard() {
  return (
    <Card className="border border-green-500/30">
      <CardHeader>
        <CardTitle>You&apos;re ready to move in!</CardTitle>
        <CardDescription>
          Thanks for sharing the key details. Explore the portal to pay rent, book amenities, and coordinate with
          roommates.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          You can update any onboarding step later from your account settings.
        </p>
        <Button asChild>
          <SmartLink href="/dashboard">Go to dashboard</SmartLink>
        </Button>
      </CardContent>
    </Card>
  )
}

function CompletedStepCard({
  stepKey,
  profile,
  contacts,
}: {
  stepKey: OnboardingStepKey
  profile: ProfileRow | null
  contacts: EmergencyContact[]
}) {
  switch (stepKey) {
    case "unit_assignment":
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unit confirmed</CardTitle>
            <CardDescription>You&apos;re assigned to {profile?.unit_id ?? "your unit"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{profile?.unit_id}</p>
          </CardContent>
        </Card>
      )
    case "rent_share":
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rent share saved</CardTitle>
            <CardDescription>We&apos;ll sync this amount with payment reminders.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{formatRentShare(profile?.rent_share)}</p>
          </CardContent>
        </Card>
      )
    case "emergency_contacts":
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency contact added</CardTitle>
            <CardDescription>We&apos;ll reach out to them only if it&apos;s urgent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Contact details will appear here once added.</p>
            ) : (
              <ul className="space-y-3">
                {contacts.map((contact) => (
                  <li key={`${contact.name}-${contact.phone}`} className="space-y-1">
                    <p className="font-medium leading-none">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.phone}
                      {contact.relationship ? ` • ${contact.relationship}` : ""}
                    </p>
                    {contact.notes && (
                      <p className="text-xs text-muted-foreground">{contact.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )
    default:
      return null
  }
}
