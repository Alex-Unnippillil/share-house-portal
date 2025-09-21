import { redirect } from "next/navigation"

export default function AuthIndexPage() {
  return redirect("/auth/login")
}
