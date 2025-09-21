import { AuthShell } from "@/app/auth/components/auth-shell"
import { SessionRenewalCard } from "@/app/auth/components/session-renewal-card"

export const metadata = {
  title: "Refresh session",
  description: "Renew your session after password or security changes.",
}

export default function SessionRenewalPage() {
  return (
    <AuthShell
      title="Refresh your session"
      description="Trigger a refresh to ensure your session reflects the latest account changes."
    >
      <SessionRenewalCard />
    </AuthShell>
  )
}
