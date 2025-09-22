"use client"

import { useCallback, useEffect, useState } from "react"
import { type User } from "@supabase/supabase-js"

import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useSupabaseBrowser from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

import Avatar from "./avatar"

type ProfileSelection = {
  full_name: string | null
  username: string | null
  website: string | null
  avatar_url: string | null
  email: string | null
}

const toNullable = (value: string) => (value.trim().length ? value : null)

export default function AccountForm({ user }: { user: User | null }) {
  const supabase = useSupabaseBrowser() as TypedSupabaseClient
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [website, setWebsite] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [email, setEmail] = useState("")

  const getProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data, error, status } = await supabase
        .from("profiles")
        .select("full_name, username, website, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle<ProfileSelection>()

      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setFullName(data.full_name ?? "")
        setUsername(data.username ?? "")
        setWebsite(data.website ?? "")
        setAvatarUrl(data.avatar_url ?? "")
        setEmail(data.email ?? user.email ?? "")
      }
    } catch (error) {
      alert("Error loading user data!")
    } finally {
      setLoading(false)
    }
  }, [supabase, user?.id, user?.email])

  useEffect(() => {
    void getProfile()
  }, [getProfile])

  const updateProfile = useCallback(
    async (fields: ProfileSelection) => {
      if (!user?.id) {
        return
      }

      try {
        setLoading(true)

        const payload = {
          id: user.id,
          full_name: fields.full_name,
          username: fields.username,
          website: fields.website,
          avatar_url: fields.avatar_url,
          email: fields.email,
          updated_at: new Date().toISOString(),
        }

        const { error } = await (supabase
          .from("profiles") as any).upsert(payload)

        if (error) throw error

        alert("Account updated!")
      } catch (error) {
        alert("Error updating the data!")
      } finally {
        setLoading(false)
      }
    },
    [supabase, user?.id],
  )

  const handleSubmit = () =>
    updateProfile({
      full_name: toNullable(fullName),
      username: toNullable(username),
      website: toNullable(website),
      avatar_url: toNullable(avatarUrl),
      email: toNullable(email),
    })

  return (
    <div className="w-full space-y-8 px-2 py-8">
      <Avatar
        uid={user?.id ?? null}
        url={avatarUrl || null}
        size={144}
        onUpload={(url) => {
          setAvatarUrl(url)
          void updateProfile({
            full_name: toNullable(fullName),
            username: toNullable(username),
            website: toNullable(website),
            avatar_url: toNullable(url),
            email: toNullable(email),
          })
        }}
      />

      <div className="flex flex-col">
        <label
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          htmlFor="email"
        >
          Email
        </label>
        <Input id="email" type="email" value={email || user?.email || ""} disabled />
      </div>

      <div className="flex flex-col">
        <label
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          htmlFor="fullName"
        >
          Full Name
        </label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
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
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
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
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="grid w-full grid-cols-1 justify-evenly gap-4">
        <button
          type="button"
          className={buttonVariants({ variant: "outline" })}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Loading ..." : "Update Account"}
        </button>
      </div>

      <div className="mb-2 flex w-full flex-col">
        <form className="items-center space-y-8" action="/auth/signout" method="post">
          <button className={buttonVariants({ variant: "outline" })} type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
