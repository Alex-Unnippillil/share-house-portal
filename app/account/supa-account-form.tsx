"use client"

import { useCallback, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"

import type { User } from "@supabase/supabase-js"

import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { BioMarkdownEditor } from "@/components/forms/bio-markdown-editor"
import { BioPreview } from "@/components/forms/bio-preview"
import { renderBioMarkdown } from "@/lib/bio"
import useSupabaseBrowser from "@/utils/supabase-browser"

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
  bioMarkdown: string
  bioHtml: string
}

function createProfileState(user: User, profile: AccountProfile | null): ProfileState {
  const initialMarkdown = profile?.bioMarkdown ?? ""
  const initialHtml = profile?.bioHtml ?? renderBioMarkdown(initialMarkdown)

  return {
    fullName: profile?.fullName ?? "",
    username: profile?.username ?? "",
    website: profile?.website ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
    email: profile?.email ?? user.email ?? "",
    bioMarkdown: initialMarkdown,
    bioHtml: initialHtml,
  }
}

export default function AccountForm({ user, profile }: AccountFormProps) {
  const supabase = useSupabaseBrowser()
  const [profileState, setProfileState] = useState(() => createProfileState(user, profile))
  const [isSaving, setIsSaving] = useState(false)

  const persistProfile = useCallback(
    async (overrides: Partial<ProfileState> = {}) => {
      const nextState = { ...profileState, ...overrides }
      const normalizedMarkdown = nextState.bioMarkdown?.trim() ?? ""
      const normalizedHtml = renderBioMarkdown(normalizedMarkdown)
      const payload = {
        ...nextState,
        bioMarkdown: normalizedMarkdown,
        bioHtml: normalizedHtml,
      }

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
          bio_markdown: payload.bioMarkdown || null,
          bio_html: payload.bioHtml || null,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          throw error
        }

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
    [profileState, supabase, user.id],
  )

  const handleChange = (field: keyof ProfileState) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setProfileState((previous) => ({ ...previous, [field]: value }))
  }

  const handleBioChange = (payload: { markdown: string; html: string }) => {
    setProfileState((previous) => {
      if (
        previous.bioMarkdown === payload.markdown &&
        previous.bioHtml === payload.html
      ) {
        return previous
      }

      return {
        ...previous,
        bioMarkdown: payload.markdown,
        bioHtml: payload.html,
      }
    })
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
            htmlFor="bio"
          >
            Bio
          </label>
          <BioMarkdownEditor
            value={profileState.bioHtml}
            onChange={({ markdown, html }) => handleBioChange({ markdown, html })}
            disabled={isSaving}
          />
          <p className="text-sm text-muted-foreground">
            Supports Markdown shortcuts like <code>**bold**</code>, <code>_italic_</code>, and <code>`code`</code> as you type.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium leading-none">Bio preview</span>
          <BioPreview html={profileState.bioHtml || renderBioMarkdown(profileState.bioMarkdown)} />
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
