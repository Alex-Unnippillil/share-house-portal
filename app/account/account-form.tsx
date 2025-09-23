"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"

const localeOptions = [
  { label: "English (United States)", value: "en-US" },
  { label: "English (United Kingdom)", value: "en-GB" },
  { label: "Français (France)", value: "fr-FR" },
  { label: "Deutsch (Deutschland)", value: "de-DE" },
  { label: "Español (España)", value: "es-ES" },
  { label: "Português (Brasil)", value: "pt-BR" },
  { label: "Português (Portugal)", value: "pt-PT" },
  { label: "日本語", value: "ja-JP" },
  { label: "한국어", value: "ko-KR" },
  { label: "中文（简体）", value: "zh-CN" },
  { label: "中文（繁體）", value: "zh-TW" },
] as const

const localeValues = localeOptions.map((option) => option.value)
const supportedTimeZones = Intl.supportedValuesOf("timeZone")
const supportedTimeZoneSet = new Set(supportedTimeZones)
const timeZoneOptions = supportedTimeZones.map((value) => ({
  value,
  label: value.replace(/_/g, " "),
}))

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
  dob: z.date({
    required_error: "A date of birth is required.",
  }),
  locale: z
    .string({
      required_error: "Please select a locale.",
    })
    .refine((value) => localeValues.includes(value), {
      message: "Please select a supported locale.",
    }),
  timeZone: z
    .string({
      required_error: "Please select a timezone.",
    })
    .refine((value) => supportedTimeZoneSet.has(value), {
      message: "Please select a supported timezone.",
    }),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

// This can come from your database or API.
const defaultValues: Partial<AccountFormValues> = {
  locale: "en-US",
  timeZone: "UTC",
  // name: "Your name",
  // dob: new Date("2023-01-23"),
}

export function AccountForm() {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  })

  function onSubmit(data: AccountFormValues) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormDescription>
                This is the name that will be displayed on your profile and in
                emails.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto size-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Your date of birth is used to calculate your age.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="locale"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Locale</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-[220px] justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? localeOptions.find((locale) => locale.value === field.value)?.label
                        : "Select locale"}
                      <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0">
                  <Command>
                    <CommandInput placeholder="Search locale..." />
                    <CommandEmpty>No locale found.</CommandEmpty>
                    <CommandGroup>
                      {localeOptions.map((locale) => (
                        <CommandItem
                          value={locale.value}
                          key={locale.value}
                          onSelect={(value) => {
                            form.setValue("locale", value)
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 size-4",
                              locale.value === field.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {locale.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                This controls currency, date, and number formatting.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timeZone"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Timezone</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-[260px] justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? timeZoneOptions.find((option) => option.value === field.value)?.label
                        : "Select timezone"}
                      <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0">
                  <Command>
                    <CommandInput placeholder="Search timezone..." />
                    <CommandEmpty>No timezone found.</CommandEmpty>
                    <CommandGroup>
                      {timeZoneOptions.map((option) => (
                        <CommandItem
                          value={option.value}
                          key={option.value}
                          onSelect={(value) => {
                            form.setValue("timeZone", value)
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 size-4",
                              option.value === field.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Events and reminders will be shown using this timezone.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Update account</Button>
      </form>
    </Form>
  )
}
