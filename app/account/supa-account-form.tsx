"use client"

import { useCallback, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"

import type { User } from "@supabase/supabase-js"

import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePreferences } from "@/components/preferences/preferences-provider"
import { SUPPORTED_LOCALES, SUPPORTED_TIMEZONES } from "@/config/preferences"
import useSupabaseBrowser from "@/utils/supabase-browser"

import Avatar from "./avatar"
import type { AccountProfile } from "./types"

interface AccountFormProps {
  user: User
  profile: AccountProfile | null
}

export type ProfileState = {
  fullName: string
  username: string
  website: string
  avatarUrl: string
  email: string
  locale: string
  timezone: string
}

function createProfileState(
  user: User,
  profile: AccountProfile | null,
  defaults: { locale: string; timezone: string },
): ProfileState {
  return {
    fullName: profile?.fullName ?? "",
    username: profile?.username ?? "",
    website: profile?.website ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
    email: profile?.email ?? user.email ?? "",
    locale: profile?.locale ?? defaults.locale,
    timezone: profile?.timezone ?? defaults.timezone,
  }
}

export function toProfileUpsertInput(profile: ProfileState, userId: string) {
  return {
    id: userId,
    full_name: profile.fullName || null,
    username: profile.username || null,
    website: profile.website || null,
    avatar_url: profile.avatarUrl || null,
    email: profile.email || null,
    locale: profile.locale || null,
    timezone: profile.timezone || null,
    updated_at: new Date().toISOString(),
  }
}

export default function AccountForm({ user, profile }: AccountFormProps) {
  const supabase = useSupabaseBrowser()
  const { locale: activeLocale, timezone: activeTimezone, setLocale, setTimezone } = usePreferences()
  const [profileState, setProfileState] = useState(() =>
    createProfileState(user, profile, {
      locale: profile?.locale ?? activeLocale,
      timezone: profile?.timezone ?? activeTimezone,
    }),
  )
  const [isSaving, setIsSaving] = useState(false)

  const persistProfile = useCallback(
    async (overrides: Partial<ProfileState> = {}) => {
      const payload = { ...profileState, ...overrides }
      setProfileState(payload)

      setIsSaving(true)
      try {
        const upsertPayload = toProfileUpsertInput(payload, user.id)
        const { error } = await supabase.from("profiles").upsert(upsertPayload)

        if (error) {
          throw error
        }

        setLocale(upsertPayload.locale ?? activeLocale)
        setTimezone(upsertPayload.timezone ?? activeTimezone)

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
    [
      activeLocale,
      activeTimezone,
      profileState,
      setLocale,
      setTimezone,
      supabase,
      user.id,
    ],
  )

  const handleChange = (field: keyof ProfileState) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setProfileState((previous) => ({ ...previous, [field]: value }))
  }

  const handleSelectChange = (field: "locale" | "timezone") => (value: string) => {
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
    <div className="w-full space-y-8 px-2 py-8">
      <Avatar
        uid={user.id}
        url={profileState.avatarUrl}
        size={144}
        onUpload={handleAvatarUpload}
      />
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="email"
          >
            Email
          </label>
          <Input id="email" value={profileState.email} disabled />
        </div>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="fullName"
          >
            Full name
          </label>
          <Input
            id="fullName"
            value={profileState.fullName}
            onChange={handleChange("fullName")}
            placeholder="Jordan Blake"
          />
        </div>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="username"
          >
            Username
          </label>
          <Input
            id="username"
            value={profileState.username}
            onChange={handleChange("username")}
            placeholder="jordy"
          />
        </div>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="website"
          >
            Website
          </label>
          <Input
            id="website"
            type="url"
            value={profileState.website}
            onChange={handleChange("website")}
            placeholder="https://sharehouse.example"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="locale"
          >
            Locale
          </label>
          <Select value={profileState.locale} onValueChange={handleSelectChange("locale")}>
            <SelectTrigger id="locale">
              <SelectValue placeholder="Select locale" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LOCALES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Used for currency, number, and date formatting across the portal.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="timezone"
          >
            Timezone
          </label>
          <Select value={profileState.timezone} onValueChange={handleSelectChange("timezone")}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_TIMEZONES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Controls how due dates and booking times appear throughout the app.
          </p>
        </div>
        <button
          className={buttonVariants({ variant: "outline" })}
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Update account"}
        </button>
      </form>
      <div className="mb-2 flex w-full flex-col">
        <form action="/auth/signout" className="items-center space-y-8" method="post">
          <button className={buttonVariants({ variant: "outline" })} type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
