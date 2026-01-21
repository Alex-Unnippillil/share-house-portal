"use client"

import { useCallback, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"

import type { User } from "@supabase/supabase-js"

import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import useSupabaseBrowser from "@/utils/supabase-browser"
import { useSessionAutoSave } from "@/hooks/use-session-auto-save"

import Avatar from "./avatar"
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

  const { clearDraft } = useSessionAutoSave<ProfileState>({
    storageKey: "account-profile-draft",
    getValues: () => profileState,
    onRestore: (draft) => {
      setProfileState((previous) => ({ ...previous, ...draft }))
    },
  })

  const persistProfile = useCallback(
    async (overrides: Partial<ProfileState> = {}) => {
      const payload = { ...profileState, ...overrides }
      setProfileState(payload)

      setIsSaving(true)
      try {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: payload.fullName || null,
          username: payload.username || null,
          website: payload.website || null,
          avatar_url: payload.avatarUrl || null,
          email: payload.email || null,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          throw error
        }

        toast({
          title: "Profile updated",
          description: "We saved your latest contact details.",
        })

        clearDraft()
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
    [clearDraft, profileState, supabase, user.id],
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
