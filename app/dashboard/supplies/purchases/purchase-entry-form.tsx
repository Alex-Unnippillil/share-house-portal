"use client"

import { useEffect, useMemo, useState, useTransition, type ChangeEvent } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import useSupabaseBrowser from "@/utils/supabase-browser"

import { createSupplyPurchase } from "./actions"

const formSchema = z.object({
  householdId: z.string().min(1, { message: "Choose a household." }),
  itemName: z
    .string()
    .min(1, { message: "Enter what was purchased." })
    .refine((value) => value.trim().length > 0, {
      message: "Enter what was purchased.",
    }),
  priceCad: z
    .string()
    .min(1, { message: "Enter the price." })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, {
      message: "Price must be zero or greater.",
    }),
  amount: z
    .string()
    .min(1, { message: "Enter the quantity." })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: "Amount must be greater than zero.",
    }),
  purchasedAt: z.string().min(1, { message: "Select the purchase date." }),
  receiptPath: z.string().nullable().optional(),
})

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
})

const percentFormatter = new Intl.NumberFormat("en-CA", {
  style: "percent",
  maximumFractionDigits: 1,
})

type FormValues = z.infer<typeof formSchema>

type HouseholdMember = {
  profile_id: string
  default_supply_split: number | null
  profile?: {
    full_name: string | null
    username: string | null
  } | null
}

type Household = {
  id: string
  name: string
  members: HouseholdMember[]
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "uploaded"; path: string }
  | { status: "error"; message: string }

const receiptBucket = "supply-receipts"

function getMemberDisplayName(member: HouseholdMember) {
  return (
    member.profile?.full_name?.trim() ||
    member.profile?.username?.trim() ||
    member.profile_id.slice(0, 8)
  )
}

function calculateShares(members: HouseholdMember[], totalCost: number) {
  if (!members.length || !Number.isFinite(totalCost)) {
    return [] as Array<{ profileId: string; ratio: number; amount: number; name: string }>
  }

  const weights = members.map((member) => Number(member.default_supply_split ?? 0))
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const evenRatio = 1 / members.length

  let runningTotal = 0
  return members.map((member, index) => {
    const ratio = weightSum <= 0 ? evenRatio : Number(member.default_supply_split ?? 0) / weightSum
    let amount = Number((totalCost * ratio).toFixed(2))

    if (index === members.length - 1) {
      amount = Number((totalCost - runningTotal).toFixed(2))
    } else {
      runningTotal = Number((runningTotal + amount).toFixed(2))
    }

    const safeAmount = Number.isFinite(amount) ? amount : 0

    return {
      profileId: member.profile_id,
      ratio,
      amount: safeAmount,
      name: getMemberDisplayName(member),
    }
  })
}

interface PurchaseEntryFormProps {
  households: Household[]
  userId: string
}

export default function PurchaseEntryForm({ households, userId }: PurchaseEntryFormProps) {
  const { toast } = useToast()
  const supabase = useSupabaseBrowser()
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" })
  const [isPending, startTransition] = useTransition()

  const defaultHouseholdId = households[0]?.id ?? ""

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      householdId: defaultHouseholdId,
      itemName: "",
      priceCad: "",
      amount: "1",
      purchasedAt: new Date().toISOString().slice(0, 10),
      receiptPath: null,
    },
  })

  const selectedHouseholdId = form.watch("householdId")
  const selectedHousehold = useMemo(
    () => households.find((household) => household.id === selectedHouseholdId),
    [households, selectedHouseholdId],
  )

  const priceValue = form.watch("priceCad")
  const amountValue = form.watch("amount")
  const totalCost = useMemo(() => {
    const price = Number(priceValue)
    const amount = Number(amountValue)

    if (Number.isNaN(price) || Number.isNaN(amount)) {
      return 0
    }

    return Number((price * amount).toFixed(2))
  }, [priceValue, amountValue])

  const sharePreview = useMemo(
    () => calculateShares(selectedHousehold?.members ?? [], totalCost),
    [selectedHousehold?.members, totalCost],
  )

  useEffect(() => {
    if (!selectedHouseholdId) {
      form.setValue("receiptPath", null)
      setUploadState({ status: "idle" })
    }
  }, [form, selectedHouseholdId])

  const handleReceiptUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    onChange: (value: string | null) => void,
  ) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!selectedHouseholdId) {
      setUploadState({ status: "error", message: "Select a household before uploading." })
      return
    }

    setUploadState({ status: "uploading" })
    const extension = file.name.split(".").pop()?.toLowerCase()
    const fileName = `${selectedHouseholdId}/${Date.now()}-${Math.random().toString(36).slice(2)}` +
      (extension ? `.${extension}` : "")

    const { error } = await supabase.storage.from(receiptBucket).upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("receipt upload", error)
      setUploadState({ status: "error", message: "Failed to upload receipt. Try again." })
      event.target.value = ""
      return
    }

    onChange(fileName)
    setUploadState({ status: "uploaded", path: fileName })
    toast({
      title: "Receipt uploaded",
      description: "The receipt is stored securely with this purchase.",
    })
    event.target.value = ""
  }

  const handleSubmit = (values: FormValues) => {
    startTransition(async () => {
      const priceCad = Number(values.priceCad)
      const amount = Number(values.amount)

      const result = await createSupplyPurchase({
        householdId: values.householdId,
        itemName: values.itemName.trim(),
        priceCad,
        amount,
        purchasedAt: values.purchasedAt,
        receiptPath: values.receiptPath ?? null,
      })

      if (result?.error) {
        toast({
          title: "Could not save purchase",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Purchase recorded",
        description: "Shares have been allocated to household members.",
      })

      form.reset({
        householdId: values.householdId,
        itemName: "",
        priceCad: "",
        amount: "1",
        purchasedAt: new Date().toISOString().slice(0, 10),
        receiptPath: null,
      })
      setUploadState({ status: "idle" })
    })
  }

  const formDisabled = households.length === 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Record a supply purchase</CardTitle>
          <CardDescription>
            Track shared supply costs and automatically split the total across your household.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formDisabled ? (
            <p className="mb-6 text-sm text-muted-foreground">
              Join or create a household to start recording shared purchases.
            </p>
          ) : null}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <fieldset className="grid gap-6" disabled={isPending || formDisabled}>
                <FormField
                  control={form.control}
                  name="householdId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Household</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue("receiptPath", null)
                          setUploadState({ status: "idle" })
                        }}
                        value={field.value}
                        disabled={formDisabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a household" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {households.map((household) => (
                            <SelectItem key={household.id} value={household.id}>
                              {household.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Paper towels, cleaning spray, etc."
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="priceCad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (CAD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            placeholder="1"
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="purchasedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchased on</FormLabel>
                      <FormControl>
                        <Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receiptPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt (optional)</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Input
                            ref={field.ref}
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(event) => handleReceiptUpload(event, (value) => field.onChange(value))}
                            disabled={uploadState.status === "uploading" || formDisabled}
                          />
                          {field.value ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                field.onChange(null)
                                setUploadState({ status: "idle" })
                              }}
                            >
                              Remove receipt
                            </Button>
                          ) : null}
                        </div>
                      </FormControl>
                      {uploadState.status === "uploading" ? (
                        <p className="text-sm text-muted-foreground">Uploading receipt…</p>
                      ) : null}
                      {uploadState.status === "error" ? (
                        <p className="text-sm text-destructive">{uploadState.message}</p>
                      ) : null}
                      {uploadState.status === "uploaded" ? (
                        <p className="text-sm text-muted-foreground">Stored as {uploadState.path}</p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total cost</p>
                  <p className="text-lg font-semibold">
                    {currencyFormatter.format(totalCost || 0)}
                  </p>
                </div>
                <Button type="submit" disabled={formDisabled || isPending}>
                  {isPending ? "Saving…" : "Record purchase"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default share breakdown</CardTitle>
          <CardDescription>
            Preview how the purchase will be allocated based on the household default split.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedHousehold && sharePreview.length ? (
            <div className="space-y-3">
              {sharePreview.map((share) => (
                <div
                  key={share.profileId}
                  className="flex items-center justify-between rounded-md border border-dashed border-muted-foreground/40 p-3"
                >
                  <div>
                    <p className="font-medium">{share.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {percentFormatter.format(share.ratio)} of total
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {currencyFormatter.format(share.amount)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
                <span>Buyer</span>
                <span className="font-medium">
                  {getMemberDisplayName({
                    profile_id: userId,
                    default_supply_split: null,
                    profile: selectedHousehold.members.find((member) => member.profile_id === userId)?.profile ?? null,
                  })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selectedHousehold
                ? "Add household members with default splits to preview how costs will be shared."
                : "Select a household to preview the share breakdown."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
