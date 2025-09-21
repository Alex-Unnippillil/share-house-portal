import { AuthShell } from "@/app/auth/components/auth-shell"
import { PasswordResetForm } from "@/app/auth/components/password-reset-form"
import { readUserSession } from "@/utils/actions"

export const metadata = {
  title: "Reset password",
  description: "Send yourself a secure password reset link.",
}

export default async function ResetPasswordPage() {
  const {
    data: { session },
  } = await readUserSession()

  return (
    <AuthShell
      title="Reset your password"
      description="We will email you a secure link to choose a new password."
    >
      <PasswordResetForm defaultEmail={session?.user.email ?? undefined} />
    </AuthShell>
  )
}
