import { redirect } from "next/navigation"

import { Contact } from "@/components/forms/contact"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { readUserSession } from "@/utils/actions"

export default async function SupportPage() {
  const userSessionResponse = await readUserSession()

  if (!userSessionResponse.data.session) {
    redirect("/auth?redirectTo=/support")
  }

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Support</h1>
          <p className="text-muted-foreground">
            Need help with payments, bookings, documents, or account access? Submit a support request and our team
            will follow up.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Contact support</CardTitle>
            <CardDescription>Include relevant details so we can route your request quickly.</CardDescription>
          </CardHeader>
          <CardContent>
            <Contact />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
