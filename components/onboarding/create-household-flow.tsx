"use client"

import * as React from "react"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Car,
  ClipboardList,
  Globe,
  Home,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  Send,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface Roommate {
  name: string
  email: string
  rentShare: string
}

interface HouseholdFormData {
  householdName: string
  propertyCode: string
  moveInDate: string
  timezone: string
  monthlyRent: string
  rentShare: string
  rentDueDay: string
  autopay: boolean
  splitNotes: string
  roommates: Roommate[]
  emergencyContactName: string
  emergencyContactPhone: string
  vehicleMake: string
  vehiclePlate: string
  householdNotes: string
}

const steps = [
  {
    id: "household",
    label: "Household",
    title: "Name your household workspace",
    description:
      "Give your shared home an identity and align the essentials so invites, reminders, and approvals route to the right place.",
  },
  {
    id: "lease",
    label: "Lease",
    title: "Lock in rent and lease details",
    description:
      "Document rent totals, personal share, and autopay preferences so everyone stays current without spreadsheets.",
  },
  {
    id: "roommates",
    label: "Roommates",
    title: "Invite your roommates",
    description:
      "List the people sharing this space. We will queue tailored invites, autopay splits, and booking access for each person.",
  },
  {
    id: "logistics",
    label: "Logistics",
    title: "Add safety & logistics context",
    description:
      "Capture emergency contacts, parking details, and household guidelines so your property manager stays in sync.",
  },
] as const

type Step = (typeof steps)[number]

const timezoneOptions = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Phoenix", label: "Arizona" },
] as const

const rentDueOptions = [
  { value: "1", label: "1st of the month" },
  { value: "5", label: "5th of the month" },
  { value: "15", label: "15th of the month" },
  { value: "last", label: "Last day of the month" },
] as const

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

function formatDueDay(value: string) {
  if (value === "last") {
    return "the last day of each month"
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return "your chosen due date"
  }

  const remainder = parsed % 10
  const ordinal =
    parsed >= 11 && parsed <= 13
      ? "th"
      : remainder === 1
        ? "st"
        : remainder === 2
          ? "nd"
          : remainder === 3
            ? "rd"
            : "th"

  return `the ${parsed}${ordinal} of each month`
}

export function CreateHouseholdFlow() {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0)
  const [formData, setFormData] = React.useState<HouseholdFormData>({
    householdName: "",
    propertyCode: "",
    moveInDate: "",
    timezone: "America/New_York",
    monthlyRent: "",
    rentShare: "",
    rentDueDay: "1",
    autopay: true,
    splitNotes: "",
    roommates: [{ name: "", email: "", rentShare: "" }],
    emergencyContactName: "",
    emergencyContactPhone: "",
    vehicleMake: "",
    vehiclePlate: "",
    householdNotes: "",
  })
  const { toast } = useToast()

  const progressValue = ((currentStepIndex + 1) / steps.length) * 100

  const timezoneLabel = React.useMemo(() => {
    const match = timezoneOptions.find((option) => option.value === formData.timezone)
    return match?.label ?? "Select timezone"
  }, [formData.timezone])

  const moveInDisplay = React.useMemo(() => {
    if (!formData.moveInDate) {
      return "Move-in date TBD"
    }

    const parsed = new Date(`${formData.moveInDate}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) {
      return "Move-in date TBD"
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsed)
  }, [formData.moveInDate])

  const roommateInvites = React.useMemo(
    () =>
      formData.roommates.filter(
        (roommate) =>
          roommate.name.trim().length > 0 ||
          roommate.email.trim().length > 0 ||
          roommate.rentShare.trim().length > 0,
      ),
    [formData.roommates],
  )

  const formattedRent = React.useMemo(() => {
    if (!formData.monthlyRent) return "Set your monthly rent"
    const value = Number(formData.monthlyRent)
    if (Number.isNaN(value)) return "Set your monthly rent"
    return currencyFormatter.format(value)
  }, [formData.monthlyRent])

  const formattedShare = React.useMemo(() => {
    if (!formData.rentShare) return null
    const value = Number(formData.rentShare)
    if (Number.isNaN(value)) return null
    return currencyFormatter.format(value)
  }, [formData.rentShare])

  const autopayBadgeClasses = formData.autopay
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"

  const autopaySummary = formData.autopay
    ? `Autopay drafts on ${formatDueDay(formData.rentDueDay)}.`
    : "Autopay is off. Roommates will receive reminders instead."

  const launchChecklist = React.useMemo(
    () => [
      {
        title: "Send invitations",
        description:
          roommateInvites.length > 0
            ? `We&apos;ll email ${roommateInvites.length} roommate${roommateInvites.length > 1 ? "s" : ""} with workspace access and rent splits.`
            : "Add roommate names and emails so they receive access to payments, bookings, and updates.",
        icon: Send,
      },
      {
        title: "Sync property manager",
        description:
          formData.propertyCode
            ? `Unit ${formData.propertyCode} will be routed to your property manager for approval.`
            : "Provide your property or unit code so we can align this workspace to the right portfolio manager.",
        icon: ClipboardList,
      },
      {
        title: "Lock in payments",
        description: formData.autopay
          ? `Autopay will start once your manager approves the plan. Drafts will run on ${formatDueDay(formData.rentDueDay)}.`
          : "Keep autopay off for now—we'll remind everyone when rent is due.",
        icon: Sparkles,
      },
    ],
    [formData.autopay, formData.propertyCode, formData.rentDueDay, roommateInvites.length],
  )

  function updateField<K extends keyof HouseholdFormData>(key: K, value: HouseholdFormData[K]) {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  function updateRoommate<K extends keyof Roommate>(index: number, key: K, value: Roommate[K]) {
    setFormData((previous) => {
      const nextRoommates = previous.roommates.map((roommate, roommateIndex) => {
        if (roommateIndex === index) {
          return {
            ...roommate,
            [key]: value,
          }
        }
        return roommate
      })

      return {
        ...previous,
        roommates: nextRoommates,
      }
    })
  }

  function addRoommate() {
    setFormData((previous) => ({
      ...previous,
      roommates: [...previous.roommates, { name: "", email: "", rentShare: "" }],
    }))
  }

  function removeRoommate(index: number) {
    setFormData((previous) => {
      if (previous.roommates.length === 1) {
        return previous
      }

      const nextRoommates = previous.roommates.filter((_, roommateIndex) => roommateIndex !== index)
      return {
        ...previous,
        roommates: nextRoommates.length > 0 ? nextRoommates : [{ name: "", email: "", rentShare: "" }],
      }
    })
  }

  function handleNextStep() {
    if (currentStepIndex === steps.length - 1) {
      toast({
        title: formData.householdName ? `${formData.householdName} is staged for launch` : "Household workspace is staged",
        description:
          roommateInvites.length > 0
            ? `We&apos;ll send ${roommateInvites.length} roommate invite${roommateInvites.length > 1 ? "s" : ""} and notify your property manager.`
            : "We&apos;ll notify your property manager and prompt you to add roommates when you&apos;re ready.",
      })
      return
    }

    setCurrentStepIndex((previous) => Math.min(previous + 1, steps.length - 1))
  }

  function handlePreviousStep() {
    setCurrentStepIndex((previous) => Math.max(previous - 1, 0))
  }

  function renderStepContent(step: Step) {
    switch (step.id) {
      case "household":
        return (
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="household-name">Household name</Label>
              <Input
                id="household-name"
                placeholder="The Loft at 21B"
                value={formData.householdName}
                onChange={(event) => updateField("householdName", event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="property-code">Property or unit code</Label>
                <Input
                  id="property-code"
                  placeholder="e.g. 21B-North"
                  value={formData.propertyCode}
                  onChange={(event) => updateField("propertyCode", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="move-in-date">Move-in date</Label>
                <Input
                  id="move-in-date"
                  type="date"
                  value={formData.moveInDate}
                  onChange={(event) => updateField("moveInDate", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Primary timezone</Label>
              <Select value={formData.timezone} onValueChange={(value) => updateField("timezone", value)}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                We align rent reminders, bookings, and visitor approvals to this timezone.
              </p>
            </div>
          </div>
        )
      case "lease":
        return (
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="monthly-rent">Monthly rent (USD)</Label>
              <Input
                id="monthly-rent"
                type="number"
                inputMode="decimal"
                placeholder="3200"
                value={formData.monthlyRent}
                onChange={(event) => updateField("monthlyRent", event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rent-share">Your share (USD)</Label>
                <Input
                  id="rent-share"
                  type="number"
                  inputMode="decimal"
                  placeholder="800"
                  value={formData.rentShare}
                  onChange={(event) => updateField("rentShare", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rent-due-day">Rent due</Label>
                <Select value={formData.rentDueDay} onValueChange={(value) => updateField("rentDueDay", value)}>
                  <SelectTrigger id="rent-due-day">
                    <SelectValue placeholder="Choose due date" />
                  </SelectTrigger>
                  <SelectContent>
                    {rentDueOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
              <div className="space-y-1">
                <Label htmlFor="autopay" className="text-sm font-medium leading-none">
                  Enable autopay
                </Label>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll draft rent on the due date and send receipts to every roommate automatically.
                </p>
              </div>
              <Switch
                id="autopay"
                aria-label="Toggle autopay"
                checked={formData.autopay}
                onCheckedChange={(checked) => updateField("autopay", checked)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="split-notes">Split notes</Label>
              <Textarea
                id="split-notes"
                rows={3}
                placeholder="Note how you divide utilities, storage, or other agreements."
                value={formData.splitNotes}
                onChange={(event) => updateField("splitNotes", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Share context for your property manager or roommates about rent and utility expectations.
              </p>
            </div>
          </div>
        )
      case "roommates":
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Invite each roommate so they receive autopay, booking, and visitor access as soon as the workspace launches.
            </p>
            <div className="space-y-4">
              {formData.roommates.map((roommate, index) => (
                <div key={index} className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">Roommate {index + 1}</p>
                    {formData.roommates.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => removeRoommate(index)}
                      >
                        <Trash2 className="mr-1 size-4" aria-hidden="true" /> Remove
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`roommate-name-${index}`}>Name</Label>
                      <Input
                        id={`roommate-name-${index}`}
                        placeholder="e.g. Taylor Reed"
                        value={roommate.name}
                        onChange={(event) => updateRoommate(index, "name", event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`roommate-email-${index}`}>Email</Label>
                      <Input
                        id={`roommate-email-${index}`}
                        type="email"
                        placeholder="taylor@roomsily.com"
                        value={roommate.email}
                        onChange={(event) => updateRoommate(index, "email", event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:max-w-[200px]">
                    <Label htmlFor={`roommate-share-${index}`}>Rent share (USD)</Label>
                    <Input
                      id={`roommate-share-${index}`}
                      type="number"
                      inputMode="decimal"
                      placeholder="800"
                      value={roommate.rentShare}
                      onChange={(event) => updateRoommate(index, "rentShare", event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
              onClick={addRoommate}
            >
              Add another roommate
            </Button>
          </div>
        )
      case "logistics":
        return (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="emergency-contact-name">Emergency contact name</Label>
                <Input
                  id="emergency-contact-name"
                  placeholder="Jordan Lee"
                  value={formData.emergencyContactName}
                  onChange={(event) => updateField("emergencyContactName", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency-contact-phone">Emergency contact phone</Label>
                <Input
                  id="emergency-contact-phone"
                  type="tel"
                  placeholder="(555) 010-7788"
                  value={formData.emergencyContactPhone}
                  onChange={(event) => updateField("emergencyContactPhone", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="vehicle-make">Vehicle make &amp; model</Label>
                <Input
                  id="vehicle-make"
                  placeholder="Honda Civic, Blue"
                  value={formData.vehicleMake}
                  onChange={(event) => updateField("vehicleMake", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehicle-plate">License plate</Label>
                <Input
                  id="vehicle-plate"
                  placeholder="NYC-4021"
                  value={formData.vehiclePlate}
                  onChange={(event) => updateField("vehiclePlate", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="household-notes">Household guidelines</Label>
              <Textarea
                id="household-notes"
                rows={4}
                placeholder="Quiet hours, recycling reminders, guest policy, or shared storage notes."
                value={formData.householdNotes}
                onChange={(event) => updateField("householdNotes", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll display these notes to roommates and property managers inside the workspace overview.
              </p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-background/80 shadow-xl shadow-primary/10">
        <CardHeader className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
              <CardTitle className="text-2xl font-semibold text-foreground">
                {steps[currentStepIndex].title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {steps[currentStepIndex].description}
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              Household runbook
            </Badge>
          </div>
          <div className="space-y-3">
            <Progress value={progressValue} className="h-2" />
            <div className="grid gap-2 sm:grid-cols-4">
              {steps.map((step, index) => {
                const isActive = index === currentStepIndex
                const isComplete = index < currentStepIndex

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStepIndex(index)}
                    className={cn(
                      "flex h-full flex-col items-start gap-2 rounded-lg border bg-background/80 px-3 py-2 text-left text-xs transition",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : isComplete
                          ? "border-primary/40 bg-primary/5 text-primary"
                          : "border-border/60 hover:border-border",
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full border text-xs font-semibold",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : isComplete
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/80 text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="font-medium text-foreground">{step.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
            <Home className="size-5 text-primary" aria-hidden="true" />
            <span>
              Use this blueprint to give your property manager everything they need before the household workspace goes live.
            </span>
          </div>
          {renderStepContent(steps[currentStepIndex])}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            <span>Progress auto-saves to your draft household setup.</span>
          </div>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            {currentStepIndex > 0 ? (
              <Button type="button" variant="ghost" onClick={handlePreviousStep}>
                <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
                Back
              </Button>
            ) : null}
            <Button type="button" onClick={handleNextStep}>
              {currentStepIndex === steps.length - 1 ? "Launch household workspace" : "Save & continue"}
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Household blueprint</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Live preview of the information we’ll sync with your property manager.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="border-primary/20 bg-background/80 text-primary">
                Preview
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</p>
                  <p className="text-base font-semibold text-foreground">
                    {formData.householdName || "Name your household"}
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/30 bg-background/80 text-primary">
                  {formData.propertyCode ? `Unit ${formData.propertyCode}` : "Unit pending"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                <span>{moveInDisplay}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="size-4 text-primary" aria-hidden="true" />
                <span>{timezoneLabel}</span>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-primary/30 bg-background/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Wallet className="size-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Monthly rent</p>
                    <p className="text-xs text-muted-foreground">
                      {formattedRent} · due on {formatDueDay(formData.rentDueDay)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("border text-xs", autopayBadgeClasses)}>
                  {formData.autopay ? "Autopay enabled" : "Autopay paused"}
                </Badge>
              </div>
              {formattedShare ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Your contribution: <span className="font-medium text-foreground">{formattedShare}</span>
                </p>
              ) : null}
              {formData.splitNotes ? (
                <p className="mt-3 rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">
                  {formData.splitNotes}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">{autopaySummary}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Roommate invites</p>
                  <p className="text-xs text-muted-foreground">
                    {roommateInvites.length > 0
                      ? `Ready to invite ${roommateInvites.length} roommate${roommateInvites.length > 1 ? "s" : ""}.`
                      : "Add roommates to share payments, bookings, and updates."}
                  </p>
                </div>
              </div>
              {roommateInvites.length > 0 ? (
                <ul className="space-y-3">
                  {roommateInvites.map((roommate, index) => (
                    <li key={`${roommate.email}-${index}`} className="flex items-start gap-3">
                      <Mail className="mt-0.5 size-4 text-primary" aria-hidden="true" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {roommate.name || "Roommate"} {roommate.rentShare ? `· ${currencyFormatter.format(Number(roommate.rentShare || "0"))}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{roommate.email || "Email pending"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-lg border border-dashed border-primary/30 bg-background/80 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Emergency contact</p>
                  <p className="text-xs text-muted-foreground">
                    {formData.emergencyContactName
                      ? `${formData.emergencyContactName} · ${formData.emergencyContactPhone || "Phone pending"}`
                      : "Add a contact so managers can escalate urgent issues quickly."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Car className="size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Parking & vehicles</p>
                  <p className="text-xs text-muted-foreground">
                    {formData.vehicleMake || formData.vehiclePlate
                      ? `${formData.vehicleMake || "Vehicle pending"} · ${formData.vehiclePlate || "Plate pending"}`
                      : "Share parking details to prevent towing surprises."}
                  </p>
                </div>
              </div>
              {formData.householdNotes ? (
                <p className="rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">
                  {formData.householdNotes}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/80">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Launch checklist</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  We queue these actions as soon as you finish onboarding.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                In preview
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-6">
              {launchChecklist.map((item, index) => (
                <li key={item.title} className="flex gap-4">
                  <div className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                    <item.icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">Stage {index + 1}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CreateHouseholdFlow
