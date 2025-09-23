"use client"

import { useCallback, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"

import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import type { User } from "@supabase/supabase-js"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import useSupabaseBrowser from "@/utils/supabase-browser"

import Avatar from "./avatar"
import type { AccountProfile } from "./types"

const DEFAULT_LOCALE = "en-US"
const DEFAULT_TIME_ZONE = "UTC"

const SUPPORTED_TIME_ZONES = Intl.supportedValuesOf("timeZone")
const SUPPORTED_TIME_ZONE_SET = new Set(SUPPORTED_TIME_ZONES)

const DEFAULT_LOCALE_CANDIDATES = [
  "en-US",
  "en-GB",
  "fr-FR",
  "de-DE",
  "es-ES",
  "pt-BR",
  "pt-PT",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "zh-CN",
  "zh-TW",
  "hi-IN",
]

function normalizeLocale(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  try {
    const [canonical] = Intl.getCanonicalLocales([value])
    return canonical ?? null
  } catch (error) {
    return null
  }
}

function normalizeTimeZone(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  return SUPPORTED_TIME_ZONE_SET.has(value) ? value : null
}

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
  locale: string
  timeZone: string
}

function createProfileState(user: User, profile: AccountProfile | null): ProfileState {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const metadataLocale =
    typeof metadata.locale === "string"
      ? metadata.locale
      : typeof metadata.preferred_locale === "string"
        ? metadata.preferred_locale
        : null
  const metadataTimeZone =
    typeof metadata.timezone === "string"
      ? metadata.timezone
      : typeof metadata.timeZone === "string"
        ? metadata.timeZone
        : typeof metadata.preferred_timezone === "string"
          ? metadata.preferred_timezone
          : typeof metadata.preferredTimeZone === "string"
            ? metadata.preferredTimeZone
            : null

  const navigatorLocale =
    typeof navigator !== "undefined" && typeof navigator.language === "string"
      ? navigator.language
      : null

  const resolvedLocale =
    normalizeLocale(profile?.locale) ??
    normalizeLocale(metadataLocale) ??
    normalizeLocale(navigatorLocale) ??
    (typeof Intl !== "undefined"
      ? normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale)
      : null) ??
    DEFAULT_LOCALE

  const resolvedTimeZone =
    normalizeTimeZone(profile?.timeZone) ??
    normalizeTimeZone(metadataTimeZone) ??
    (typeof Intl !== "undefined"
      ? normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
      : null) ??
    DEFAULT_TIME_ZONE

  return {
    fullName: profile?.fullName ?? "",
    username: profile?.username ?? "",
    website: profile?.website ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
    email: profile?.email ?? user.email ?? "",
    locale: resolvedLocale,
    timeZone: resolvedTimeZone,
  }
}

export default function AccountForm({ user, profile }: AccountFormProps) {
  const supabase = useSupabaseBrowser()
  const [profileState, setProfileState] = useState(() => createProfileState(user, profile))
  const [isSaving, setIsSaving] = useState(false)
  const [isLocaleOpen, setIsLocaleOpen] = useState(false)
  const [isTimeZoneOpen, setIsTimeZoneOpen] = useState(false)

  const localeDisplayNames = useMemo(() => {
    if (typeof Intl.DisplayNames === "undefined") {
      return null
    }

    try {
      return new Intl.DisplayNames([profileState.locale || DEFAULT_LOCALE], {
        type: "language",
      })
    } catch (error) {
      try {
        return new Intl.DisplayNames([DEFAULT_LOCALE], { type: "language" })
      } catch (nestedError) {
        return null
      }
    }
  }, [profileState.locale])

  const localeOptions = useMemo(() => {
    const runtimeLocales =
      typeof navigator !== "undefined" && Array.isArray(navigator.languages)
        ? navigator.languages
        : []

    const combined = [
      ...runtimeLocales,
      profile?.locale ?? null,
      profileState.locale,
      ...DEFAULT_LOCALE_CANDIDATES,
    ].filter((value): value is string => Boolean(value))

    const canonicalLocales = (() => {
      try {
        return Intl.getCanonicalLocales(combined)
      } catch (error) {
        return combined
      }
    })()

    const supportedLocales = Intl.DateTimeFormat.supportedLocalesOf(
      canonicalLocales,
    )
    const uniqueLocales = Array.from(new Set(supportedLocales))

    return uniqueLocales
      .map((value) => ({
        value,
        label: localeDisplayNames?.of(value) ?? value,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [localeDisplayNames, profile?.locale, profileState.locale])

  const timezoneOptions = useMemo(
    () =>
      SUPPORTED_TIME_ZONES.map((value) => ({
        value,
        label: value.replace(/_/g, " "),
      })),
    [],
  )

  const selectedLocaleOption = useMemo(
    () => localeOptions.find((option) => option.value === profileState.locale) ?? null,
    [localeOptions, profileState.locale],
  )

  const selectedTimeZoneOption = useMemo(
    () =>
      timezoneOptions.find((option) => option.value === profileState.timeZone) ??
      (profileState.timeZone
        ? {
            value: profileState.timeZone,
            label: profileState.timeZone.replace(/_/g, " "),
          }
        : null),
    [profileState.timeZone, timezoneOptions],
  )

  const persistProfile = useCallback(
    async (overrides: Partial<ProfileState> = {}) => {
      const merged = { ...profileState, ...overrides }
      const normalizedLocale = normalizeLocale(merged.locale) ?? DEFAULT_LOCALE
      const normalizedTimeZone =
        normalizeTimeZone(merged.timeZone) ?? DEFAULT_TIME_ZONE
      const nextState: ProfileState = {
        ...merged,
        locale: normalizedLocale,
        timeZone: normalizedTimeZone,
      }

      setProfileState(nextState)

      setIsSaving(true)
      try {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: nextState.fullName || null,
          username: nextState.username || null,
          website: nextState.website || null,
          avatar_url: nextState.avatarUrl || null,
          email: nextState.email || null,
          locale: nextState.locale || null,
          timezone: nextState.timeZone || null,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          throw error
        }

        toast({
          title: "Profile updated",
          description: "We saved your latest contact details and preferences.",
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
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="locale"
          >
            Locale
          </label>
          <Popover open={isLocaleOpen} onOpenChange={setIsLocaleOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={isLocaleOpen}
                className="justify-between"
              >
                {selectedLocaleOption?.label ?? profileState.locale ?? "Select locale"}
                <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search locale..." />
                <CommandEmpty>No locale found.</CommandEmpty>
                <CommandGroup>
                  {localeOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(nextValue) => {
                        const normalized = normalizeLocale(nextValue) ?? DEFAULT_LOCALE
                        setProfileState((previous) => ({
                          ...previous,
                          locale: normalized,
                        }))
                        setIsLocaleOpen(false)
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 size-4",
                          option.value === profileState.locale
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-sm text-muted-foreground">
            Choose how dates, numbers, and currency appear across the portal.
          </p>
        </div>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="timeZone"
          >
            Timezone
          </label>
          <Popover open={isTimeZoneOpen} onOpenChange={setIsTimeZoneOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={isTimeZoneOpen}
                className="justify-between"
              >
                {selectedTimeZoneOption?.label ?? profileState.timeZone ?? "Select timezone"}
                <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search timezone..." />
                <CommandEmpty>No timezone found.</CommandEmpty>
                <CommandGroup>
                  {timezoneOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(nextValue) => {
                        const normalized = normalizeTimeZone(nextValue) ?? DEFAULT_TIME_ZONE
                        setProfileState((previous) => ({
                          ...previous,
                          timeZone: normalized,
                        }))
                        setIsTimeZoneOpen(false)
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 size-4",
                          option.value === profileState.timeZone
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-sm text-muted-foreground">
            We will use this timezone for reminders and activity history.
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
