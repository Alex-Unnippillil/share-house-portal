import { AuthShell } from "@/app/auth/components/auth-shell"
import { MfaPanel } from "@/app/auth/components/mfa-panel"
import { readUserSession } from "@/utils/actions"

export const metadata = {
  title: "Multi-factor authentication",
  description: "Protect your account with an additional verification step.",
}

export default async function MfaPage() {
  const {
    data: { session },
  } = await readUserSession()

  return (
    <AuthShell
      title="Secure your account"
      description="Send a one-time code to your email or learn how to use an authenticator app."
    >
      <MfaPanel defaultEmail={session?.user.email ?? undefined} />
    </AuthShell>
  )
}
