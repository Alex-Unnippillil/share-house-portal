"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

type CreationResult = {
  clientId: string
  clientSecret: string
  keyId: string
}

type FormState = {
  name: string
  redirectUri: string
  description: string
}

const INITIAL_FORM_STATE: FormState = {
  name: "",
  redirectUri: "",
  description: "",
}

export default function CreateClientForm() {
  const router = useRouter()
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE)
  const [result, setResult] = useState<CreationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const updateField = (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState(current => ({ ...current, [field]: event.target.value }))
    }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const payload: Record<string, string> = {
      name: formState.name.trim(),
    }

    if (formState.redirectUri.trim()) {
      payload.redirectUri = formState.redirectUri.trim()
    }

    if (formState.description.trim()) {
      payload.description = formState.description.trim()
    }

    startTransition(async () => {
      setResult(null)
      try {
        const response = await fetch("/api/developer/clients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          const message =
            (data && typeof data.error === "string" && data.error) ||
            "Failed to create OAuth client"
          setError(message)
          toast({
            title: "Failed to create client",
            description: message,
            variant: "destructive",
          })
          return
        }

        setResult(data as CreationResult)
        setFormState(INITIAL_FORM_STATE)
        toast({
          title: "OAuth client issued",
          description:
            "Copy the client secret now. It will not be shown again after you leave this page.",
        })
        router.refresh()
      } catch (fetchError) {
        console.error("[developer] Failed to submit OAuth client form", fetchError)
        const message = "Network error while creating OAuth client"
        setError(message)
        toast({
          title: "Network error",
          description: message,
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new OAuth client</CardTitle>
        <CardDescription>
          Provide a descriptive name and optional redirect URI for the integration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="client-name">Client name</Label>
            <Input
              id="client-name"
              required
              placeholder="Calendar sync service"
              value={formState.name}
              onChange={updateField("name")}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-redirect">Redirect URI</Label>
            <Input
              id="client-redirect"
              placeholder="https://integration.example.com/oauth/callback"
              value={formState.redirectUri}
              onChange={updateField("redirectUri")}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Required for authorization code flows. Leave blank for machine-to-machine clients.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-description">Description</Label>
            <Textarea
              id="client-description"
              placeholder="Short summary of the integration"
              value={formState.description}
              onChange={updateField("description")}
              disabled={isPending}
              rows={3}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <Button type="submit" disabled={isPending || !formState.name.trim()}>
              {isPending ? "Issuing credentials…" : "Create OAuth client"}
            </Button>
          </div>
        </form>
        {result ? (
          <div
            className="mt-6 space-y-3 rounded-md border border-dashed bg-muted/50 p-4"
            aria-live="polite"
          >
            <p className="text-sm font-medium">Client credentials</p>
            <p className="text-xs text-muted-foreground">
              Store these values securely. The client secret is only displayed once.
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Client ID
                </p>
                <code className="block break-all rounded bg-background px-2 py-1 text-sm">
                  {result.clientId}
                </code>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Client secret
                </p>
                <code className="block break-all rounded bg-background px-2 py-1 text-sm">
                  {result.clientSecret}
                </code>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
