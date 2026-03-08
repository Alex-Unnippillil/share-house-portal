import { CheckCircle2, ListChecks, RefreshCw, Sparkles, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const chorePlaybooks = [
  {
    title: "Room-based rotations",
    inspiration: "OurHome",
    description:
      "Mirror OurHome’s room and category filters so every roommate knows exactly which space they are responsible for each week.",
    highlights: [
      "Recurring reminders keep assignments consistent without needing manual nudges.",
      "Gamified streaks and completion points reward roommates who finish their rotation early.",
      "Shared shopping lists sync with pantry chores so supplies land before the next clean.",
    ],
  },
  {
    title: "Bundled household hub",
    inspiration: "Flatastic & Flatify",
    description:
      "Adopt the European flatmate organizer pattern where chores, shopping, and expenses live in one transparent dashboard.",
    highlights: [
      "Cleaning rotations auto-assign based on roommate availability blocks.",
      "Split essential purchases immediately so balances stay fair across the unit.",
      "Calendar sync ensures chore sprints never collide with amenity bookings.",
    ],
  },
  {
    title: "Accountability radar",
    inspiration: "Mates On Rent",
    description:
      "Layer rent, rules, and chores together so the house receives instant pings when something needs attention.",
    highlights: [
      "Publish household rules for cleaning cadence, quiet hours, and guest expectations.",
      "Realtime notifications fire when tasks slip or a roommate requests a swap.",
      "Tie chore completions to rent relief credits or maintenance priorities for extra motivation.",
    ],
  },
]

const automationModes = [
  {
    value: "rotations",
    label: "Chore rotations",
    summary: "Weekly cadence with role coverage",
    items: [
      "Auto-assign roommates to kitchens, bathrooms, and shared living spaces with rotation logic inspired by OurHome.",
      "Add substitute queue so someone can volunteer to cover if the assigned roommate is away.",
      "Notify the household feed when a rotation is complete, and archive proof photos if required.",
    ],
    completion: 72,
  },
  {
    value: "shopping",
    label: "Shared shopping",
    summary: "Real-time restock signal",
    items: [
      "Mirror OurHome and Flatify grocery boards with live updates as roommates tick items off.",
      "Attach receipts, split expenses, and push pay-back reminders through the finance rail.",
      "Surface low-stock alerts before the next scheduled deep clean hits.",
    ],
    completion: 58,
  },
  {
    value: "rules",
    label: "Rules & alerts",
    summary: "House policy guardrails",
    items: [
      "Reference Mates On Rent by capturing custom rules for cleaning pace, noise, and guests.",
      "Trigger push and email alerts whenever a rule is updated or a violation is logged.",
      "Log acknowledgement receipts in Supabase so everyone knows the current policy set.",
    ],
    completion: 84,
  },
]

const capabilityMatrix = [
  {
    capability: "Assign chores by room or category",
    approach: "Floorplan overlays map rooms to roommates with recurring slots that can be shuffled by admins.",
    reference: "OurHome",
  },
  {
    capability: "Track shared supplies and costs",
    approach: "Pantry lists pull in receipts, auto-splitting costs just like Flatastic while syncing to rent ledgers.",
    reference: "Flatastic / Flatify",
  },
  {
    capability: "Surface household rules alongside chores",
    approach: "Rules live next to the rotation board and issue alerts through the realtime message feed.",
    reference: "Mates On Rent",
  },
  {
    capability: "Reward engagement and transparency",
    approach: "Progress badges and points feed into roommate profiles to celebrate streaks and on-time completions.",
    reference: "OurHome & Mates On Rent",
  },
]

export default function ChoresPage() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
          Household scheduling &amp; chores
        </Badge>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Keep the household running in rhythm</h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            Blend proven patterns from OurHome, Flatastic, and Mates On Rent into a single dashboard that coordinates chores,
            shopping, and accountability for every roommate.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ListChecks className="size-4" /> Weekly tasks prepared
            </div>
            <p className="mt-2 text-2xl font-semibold">18 chores synced</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="size-4" /> Roommates aligned
            </div>
            <p className="mt-2 text-2xl font-semibold">4/4 confirmed</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="size-4" /> Streaks active
            </div>
            <p className="mt-2 text-2xl font-semibold">6 badges earned</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {chorePlaybooks.map((playbook) => (
          <Card key={playbook.title} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Inspired by {playbook.inspiration}</span>
                <Badge variant="secondary">Playbook</Badge>
              </div>
              <CardTitle className="text-xl">{playbook.title}</CardTitle>
              <CardDescription>{playbook.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {playbook.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Operational modes</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Configure the chore engine to match your household’s rituals. Each mode combines scheduling, messaging, and
            finance cues so everyone stays in sync.
          </p>
        </div>
        <Tabs defaultValue="rotations" className="w-full">
          <TabsList>
            {automationModes.map((mode) => (
              <TabsTrigger key={mode.value} value={mode.value}>
                {mode.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {automationModes.map((mode) => (
            <TabsContent key={mode.value} value={mode.value}>
              <Card>
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>{mode.label}</CardTitle>
                      <CardDescription>{mode.summary}</CardDescription>
                    </div>
                    <div className="min-w-[180px]">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Implementation progress</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={mode.completion} className="h-2 flex-1" />
                        <span className="text-sm font-semibold text-foreground">{mode.completion}%</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {mode.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <RefreshCw className="mt-0.5 size-4 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Capability matrix</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every capability borrows the strongest ideas from leading roommate apps while layering in Supabase, Stripe, and
            Cal.com data so the portal becomes a single source of truth.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60">
              <tr className="text-muted-foreground">
                <th className="px-4 py-3 font-medium">Capability</th>
                <th className="px-4 py-3 font-medium">Roomsily approach</th>
                <th className="px-4 py-3 font-medium">Reference inspiration</th>
              </tr>
            </thead>
            <tbody>
              {capabilityMatrix.map((item) => (
                <tr key={item.capability} className="border-t">
                  <td className="px-4 py-3 font-medium text-foreground">{item.capability}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.approach}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{item.reference}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Rollout checklist</CardTitle>
            <CardDescription>
              Move from prototype to production with a clear sequence of steps that blends scheduling, shopping, and shared
              accountability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">Sprint one</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                    <span>Seed Supabase with core chores, room tags, and roommate roles.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                    <span>Configure Cal.com availability windows for deep clean sessions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                    <span>Launch shared shopping lists with instant notifications and receipt uploads.</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">Sprint two</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                    <span>Roll out gamified streaks and leaderboard badges tied to completion data.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                    <span>Sync expense splits to Stripe billing so reimbursements stay transparent.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                    <span>Publish house rules with acknowledgement tracking and automated alerts.</span>
                  </li>
                </ul>
              </div>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">
              Once these steps are complete, the household earns a living chore assistant that balances fairness, visibility,
              and fun—directly informed by OurHome’s gamification, Flatastic’s transparency, and Mates On Rent’s rule engine.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}


