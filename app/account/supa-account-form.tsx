"use client"

import { useCallback, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"

import { format, formatDistanceToNow } from "date-fns"
import type { User } from "@supabase/supabase-js"

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
import { toast } from "@/components/ui/use-toast"
import useSupabaseBrowser from "@/utils/supabase-browser"

import ProfileAvatar from "./avatar"
import type { AccountProfile } from "./types"

interface AccountFormProps {
  user: User
  profile: AccountProfile | null
}

type ProfileState = {
  fullName: string
  username: string
  website: string
  avatarUrl: string
  email: string
}

type DateDescriptor = {
  absolute: string | null
  relative: string | null
}

function createProfileState(user: User, profile: AccountProfile | null): ProfileState {
  return {
    fullName: profile?.fullName ?? "",
    username: profile?.username ?? "",
    website: profile?.website ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
    email: profile?.email ?? user.email ?? "",
  }
}

export default function AccountForm({ user, profile }: AccountFormProps) {
  const supabase = useSupabaseBrowser()
  const [profileState, setProfileState] = useState(() => createProfileState(user, profile))
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(profile?.updatedAt ?? null)

  const joinedAt = useMemo<DateDescriptor>(() => {
    if (!user.created_at) {
      return { absolute: null, relative: null }
    }

    try {
      const createdAt = new Date(user.created_at)
      return {
        absolute: format(createdAt, "PPP"),
        relative: formatDistanceToNow(createdAt, { addSuffix: true }),
      }
    } catch (error) {
      console.error("Failed to parse created_at", error)
      return { absolute: null, relative: null }
    }
  }, [user.created_at])

  const lastUpdatedAt = useMemo<DateDescriptor>(() => {
    if (!lastSavedAt) {
      return { absolute: null, relative: null }
    }

    try {
      const updatedAt = new Date(lastSavedAt)
      return {
        absolute: format(updatedAt, "PPP p"),
        relative: formatDistanceToNow(updatedAt, { addSuffix: true }),
      }
    } catch (error) {
      console.error("Failed to parse updated_at", error)
      return { absolute: null, relative: null }
    }
  }, [lastSavedAt])

  const emailVerified = Boolean(user.email_confirmed_at)
  const displayName = profileState.fullName || profileState.email || user.email || "Your profile"

  const persistProfile = useCallback(
    async (overrides: Partial<ProfileState> = {}) => {
      const payload = { ...profileState, ...overrides }
      setProfileState(payload)

      setIsSaving(true)
      try {
        const timestamp = new Date().toISOString()
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: payload.fullName || null,
          username: payload.username || null,
          website: payload.website || null,
          avatar_url: payload.avatarUrl || null,
          email: payload.email || null,
          updated_at: timestamp,
        })

        if (error) {
          throw error
        }

        setLastSavedAt(timestamp)
        toast({
          title: "Profile updated",
          description: "We saved your latest contact details.",
        })
      } catch (error) {
        console.error("Failed to update profile", error)
        toast({
          variant: "destructive",
          title: "Unable to update profile",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while saving your profile.",
        })
      } finally {
        setIsSaving(false)
      }
    },
    [profileState, supabase, user.id]
  )

  const handleChange = (field: keyof ProfileState) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setProfileState((previous) => ({ ...previous, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await persistProfile()
  }

  const handleAvatarUpload = async (url: string) => {
    await persistProfile({ avatarUrl: url })
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Account snapshot</CardTitle>
          <CardDescription>
            A quick overview of the key details your roommates and property manager rely on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-background/40 p-4">
              <dt className="text-sm text-muted-foreground">Primary email</dt>
              <dd className="mt-2 flex flex-wrap items-center gap-2 text-base font-medium">
                <span className="break-all">{profileState.email || "—"}</span>
                <Badge variant={emailVerified ? "complete" : "outline"}>
                  {emailVerified ? "Verified" : "Awaiting verification"}
                </Badge>
              </dd>
              <p className="mt-3 text-sm text-muted-foreground">
                We use this address for rent receipts, booking confirmations, and important notices.
              </p>
            </div>
            <div className="rounded-lg border bg-background/40 p-4">
              <dt className="text-sm text-muted-foreground">Member since</dt>
              <dd className="mt-2 text-base font-medium">{joinedAt.absolute ?? "Not available"}</dd>
              <p className="mt-3 text-sm text-muted-foreground">
                {joinedAt.relative ? `Active ${joinedAt.relative}.` : "We'll keep this up to date once your account is confirmed."}
              </p>
            </div>
            <div className="rounded-lg border bg-background/40 p-4">
              <dt className="text-sm text-muted-foreground">Last profile update</dt>
              <dd className="mt-2 text-base font-medium">
                {lastUpdatedAt.relative ?? "Not saved yet"}
              </dd>
              <p className="mt-3 text-sm text-muted-foreground">
                {lastUpdatedAt.absolute
                  ? `Last confirmed ${lastUpdatedAt.absolute}.`
                  : "Save your details below so everyone stays coordinated."}
              </p>
            </div>
          </dl>
        </CardContent>
      </Card>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>
              Introduce yourself and share how we should reach you around the house.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-8 lg:flex-row">
              <ProfileAvatar
                uid={user.id}
                url={profileState.avatarUrl}
                size={144}
                name={displayName}
                onUpload={handleAvatarUpload}
              />
              <div className="grid flex-1 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profileState.email} disabled aria-readonly />
                  <p className="text-sm text-muted-foreground">
                    Your email is managed through Supabase Auth. Contact the property team if it needs updating.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={profileState.fullName}
                    onChange={handleChange("fullName")}
                    placeholder="Jordan Blake"
                    autoComplete="name"
                  />
                  <p className="text-sm text-muted-foreground">
                    Displayed on rent receipts, maintenance follow-ups, and visitor logs.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileState.username}
                    onChange={handleChange("username")}
                    placeholder="jordy"
                    autoComplete="nickname"
                  />
                  <p className="text-sm text-muted-foreground">
                    Roommates see this name when you comment on the board or book amenities.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={profileState.website}
                    onChange={handleChange("website")}
                    placeholder="https://sharehouse.example"
                    autoComplete="url"
                  />
                  <p className="text-sm text-muted-foreground">
                    Optional. Perfect for linking a portfolio, calendar, or roommate handbook.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {lastUpdatedAt.relative
                ? `Last saved ${lastUpdatedAt.relative}.`
                : "Changes are stored the moment you press \"Save changes\"."}
            </p>
            <Button type="submit" isLoading={isSaving}>
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>Log out of the Share House Portal on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Signing out keeps communal devices secure. You can always hop back in with your email link.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <form action="/auth/signout" method="post">
            <Button variant="destructive" type="submit">
              Sign out
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
