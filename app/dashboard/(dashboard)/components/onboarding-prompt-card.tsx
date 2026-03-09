import SmartLink from "@/components/navigation/SmartLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { computeOnboardingCompletion } from "@/lib/onboarding"
import { createClient } from "@/utils/supabase/server"

export async function OnboardingPromptCard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .single()

  const metadata = (profile?.metadata ?? {}) as { onboarding?: { completed_steps?: string[] } }
  const completion = computeOnboardingCompletion(metadata.onboarding?.completed_steps ?? [])

  if (completion.isComplete) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Complete onboarding</CardTitle>
          <Badge variant="secondary">{completion.completionPercent}% done</Badge>
        </div>
        <CardDescription>
          Finish your profile setup to unlock accurate rent reminders, booking approvals, and emergency communication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={completion.completionPercent} />
        <Button asChild className="w-full sm:w-auto">
          <SmartLink href="/onboarding" intent="navigation">
            Continue onboarding
          </SmartLink>
        </Button>
      </CardContent>
    </Card>
  )
}
