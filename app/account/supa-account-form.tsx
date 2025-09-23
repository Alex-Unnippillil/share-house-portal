"use client"

import React, { useCallback, useEffect, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import type { User } from "@supabase/supabase-js"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { buttonVariants } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import useSupabaseBrowser from "@/utils/supabase-browser"

import Avatar from "./avatar"
import type { AccountProfile } from "./types"

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Full name must be at least 2 characters." }),
  username: z
    .string()
    .trim()
    .min(2, { message: "Username must be at least 2 characters." }),
  website: z
    .string()
    .trim()
    .refine((value) => {
      if (value.length === 0) {
        return true
      }

      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    }, { message: "Please enter a valid URL." }),
  avatarUrl: z.string().optional(),
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address." }),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface AccountFormProps {
  user: User
  profile: AccountProfile | null
}

function createProfileState(
  user: User,
  profile: AccountProfile | null,
): ProfileFormValues {
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
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: createProfileState(user, profile),
  })

  useEffect(() => {
    if (profile?.fullName || profile?.username || profile?.website) {
      void form.trigger()
    }
  }, [form, profile])

  const persistProfile = useCallback(
    async (values: ProfileFormValues) => {
      setIsSaving(true)
      try {
        const payload = {
          id: user.id,
          full_name: values.fullName,
          username: values.username,
          website: values.website.length > 0 ? values.website : null,
          avatar_url: values.avatarUrl ? values.avatarUrl : null,
          email: values.email,
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase.from("profiles").upsert(payload)

        if (error) {
          throw error
        }

        form.reset(values)

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
    [form, supabase, user.id],
  )

  const handleAvatarUpload = useCallback(
    async (url: string) => {
      form.setValue("avatarUrl", url, { shouldDirty: true, shouldValidate: true })
      const isValid = await form.trigger()

      if (isValid) {
        const parsedValues = profileSchema.parse(form.getValues())
        await persistProfile(parsedValues)
      }
    },
    [form, persistProfile],
  )

  const avatarUrl = form.watch("avatarUrl")

  return (
    <div className="w-full space-y-8 px-2 py-8">
      <Avatar uid={user.id} url={avatarUrl || null} size={144} onUpload={handleAvatarUpload} />
      <Form {...form}>
        <form className="grid gap-6" onSubmit={form.handleSubmit(persistProfile)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Jordan Blake" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="jordy" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://sharehouse.example" type="url" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button
            className={buttonVariants({ variant: "outline" })}
            disabled={isSaving || !form.formState.isValid}
            type="submit"
          >
            {isSaving ? "Saving..." : "Update account"}
          </button>
        </form>
      </Form>
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
