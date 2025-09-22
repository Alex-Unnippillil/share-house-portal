"use client"

import { useMemo, useState, useTransition } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { createMonthlyInvoices } from "../actions"
import {
  type CreateMonthlyInvoicesInput,
  type InvoiceMemberInput,
  type SupplyShareSelection,
  createMonthlyInvoicesSchema,
} from "../schema"

export interface InvoiceMemberOption {
  id: string
  name: string
  email?: string | null
  defaultRent?: number | null
}

export interface SupplyShareOption {
  id: string
  memberId: string
  amount: number
  label: string
  billingMonth?: string | null
  createdAt?: string | null
}

export interface RecentInvoiceSummary {
  id: string
  memberId: string
  memberName: string
  status: string
  billingMonth: string
  dueDate: string
  totalAmount: number
  rentAmount?: number | null
  supplyTotal?: number | null
  createdAt?: string | null
  memo?: string | null
}

interface InvoiceBuilderProps {
  members: InvoiceMemberOption[]
  supplyShares: SupplyShareOption[]
  recentInvoices: RecentInvoiceSummary[]
}

const now = new Date()
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
const defaultDueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(now.getDate() + 7, 28))

const defaultValues: CreateMonthlyInvoicesInput = {
  billingMonth: defaultMonth,
  dueDate: format(defaultDueDate, "yyyy-MM-dd"),
  memo: "",
  members: [],
}

type ActionResult =
  | { status: "success"; message: string; insertedCount: number }
  | { status: "error"; message: string }

export function InvoiceBuilder({ members, supplyShares, recentInvoices }: InvoiceBuilderProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>()
  const [actionState, setActionState] = useState<ActionResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreateMonthlyInvoicesInput>({
    resolver: zodResolver(createMonthlyInvoicesSchema),
    defaultValues,
  })

  const fieldArray = useFieldArray({ control: form.control, name: "members" })

  const selectedMembers = form.watch("members")

  const availableMembers = useMemo(
    () =>
      members.filter(
        (memberOption) =>
          !selectedMembers.some((selectedMember) => selectedMember.memberId === memberOption.id),
      ),
    [members, selectedMembers],
  )

  const supplySharesByMember = useMemo(() => {
    return supplyShares.reduce<Record<string, SupplyShareOption[]>>((acc, share) => {
      if (!acc[share.memberId]) {
        acc[share.memberId] = []
      }
      acc[share.memberId].push(share)
      return acc
    }, {})
  }, [supplyShares])

  const handleAddMember = (memberId: string) => {
    const member = members.find((option) => option.id === memberId)
    if (!member) return

    const rentAmount = typeof member.defaultRent === "number" ? member.defaultRent : 0

    const entry: InvoiceMemberInput = {
      memberId: member.id,
      memberName: member.name,
      rentAmount,
      supplyShares: [],
      note: "",
    }

    fieldArray.append(entry)
    setSelectedMemberId(undefined)
  }

  const handleRemoveMember = (index: number) => {
    fieldArray.remove(index)
  }

  const handleSupplyToggle = (index: number, share: SupplyShareOption, checked: boolean) => {
    const currentShares = form.getValues(`members.${index}.supplyShares`)
    const payload: SupplyShareSelection = {
      id: share.id,
      amount: share.amount,
      label: share.label,
    }

    if (checked) {
      form.setValue(`members.${index}.supplyShares`, [...currentShares, payload], {
        shouldDirty: true,
        shouldTouch: true,
      })
    } else {
      form.setValue(
        `members.${index}.supplyShares`,
        currentShares.filter((item) => item.id !== share.id),
        { shouldDirty: true, shouldTouch: true },
      )
    }
  }

  const onSubmit = (values: CreateMonthlyInvoicesInput) => {
    startTransition(async () => {
      setActionState(null)
      const result = await createMonthlyInvoices({
        ...values,
        members: values.members.map((member) => ({
          ...member,
          rentAmount: Number(member.rentAmount ?? 0),
          supplyShares: member.supplyShares.map((share) => ({
            ...share,
            amount: Number(share.amount ?? 0),
          })),
        })),
      })

      setActionState(result)

      if (result.status === "success") {
        form.reset({
          ...values,
          members: [],
        })
      }
    })
  }

  return (
    <div className="space-y-8">
      <Card className="border-dashed">
        <CardHeader className="space-y-1">
          <CardTitle>Create monthly invoices</CardTitle>
          <CardDescription>
            Select the roommates you need to bill, define their rent share, and roll in any shared supply costs before publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {actionState ? (
            <div
              className={cn(
                "rounded-md border px-4 py-3 text-sm",
                actionState.status === "success"
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300",
              )}
            >
              <div className="font-medium">
                {actionState.status === "success" ? "Invoices created" : "Unable to create invoices"}
              </div>
              <p className="mt-1 text-sm">
                {actionState.message}
                {actionState.status === "success" && actionState.insertedCount > 0
                  ? ` (${actionState.insertedCount} draft${actionState.insertedCount === 1 ? "" : "s"} ready)`
                  : null}
              </p>
            </div>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="billingMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing month</FormLabel>
                      <FormControl>
                        <Input
                          type="month"
                          disabled={isPending}
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={isPending}
                          value={field.value}
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
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin memo (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add context for this batch (only admins can see this memo)."
                        disabled={isPending}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">Assign roommates</h3>
                    <p className="text-sm text-muted-foreground">
                      Add each roommate that needs an invoice this cycle and adjust their rent share below.
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Select
                      value={selectedMemberId}
                      onValueChange={(value) => {
                        setSelectedMemberId(value)
                        handleAddMember(value)
                      }}
                      disabled={availableMembers.length === 0 || isPending}
                    >
                      <SelectTrigger className="w-full min-w-[200px]">
                        <SelectValue placeholder="Select roommate" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            No roommates available
                          </SelectItem>
                        ) : (
                          availableMembers.map((memberOption) => (
                            <SelectItem key={memberOption.id} value={memberOption.id}>
                              <div className="flex flex-col text-left">
                                <span>{memberOption.name}</span>
                                {memberOption.email ? (
                                  <span className="text-xs text-muted-foreground">{memberOption.email}</span>
                                ) : null}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={availableMembers.length === 0 || isPending}
                      onClick={() => {
                        if (availableMembers[0]) {
                          handleAddMember(availableMembers[0].id)
                        }
                      }}
                    >
                      Quick add
                    </Button>
                  </div>
                </div>

                {(() => {
                  const rootError = form.formState.errors.members as
                    | { root?: { message?: string } }
                    | undefined
                  const arrayMessage = rootError?.root?.message ??
                    (rootError as { message?: string } | undefined)?.message

                  return arrayMessage ? (
                    <p className="text-sm font-medium text-destructive">{arrayMessage}</p>
                  ) : null
                })()}

                {selectedMembers.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    Select at least one roommate to start building invoices.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fieldArray.fields.map((field, index) => {
                      const memberSupplies = supplySharesByMember[field.memberId] ?? []
                      const supplySelections = selectedMembers[index]?.supplyShares ?? []
                      const supplyTotal = supplySelections.reduce((sum, item) => sum + (item.amount ?? 0), 0)
                      const invoiceTotal = (selectedMembers[index]?.rentAmount ?? 0) + supplyTotal

                      return (
                        <Card key={field.id}>
                          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <CardTitle className="text-lg">{selectedMembers[index]?.memberName}</CardTitle>
                              <CardDescription>
                                {members.find((member) => member.id === field.memberId)?.email ?? "No email on file"}
                              </CardDescription>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(index)}
                              disabled={isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`members.${index}.rentAmount`}
                                render={({ field: rentField }) => (
                                  <FormItem>
                                    <FormLabel>Monthly rent</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        disabled={isPending}
                                        value={Number.isFinite(rentField.value) ? rentField.value : ""}
                                        onChange={(event) => {
                                          const value = event.target.value
                                          rentField.onChange(value === "" ? 0 : Number(event.target.value))
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`members.${index}.note`}
                                render={({ field: noteField }) => (
                                  <FormItem>
                                    <FormLabel>Private note</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="text"
                                        placeholder="Optional memo for this roommate"
                                        disabled={isPending}
                                        value={noteField.value ?? ""}
                                        onChange={(event) => noteField.onChange(event.target.value)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Supply roll-ins</h4>
                                {supplySelections.length > 0 ? (
                                  <Badge variant="secondary">
                                    +${supplyTotal.toFixed(2)} from supplies
                                  </Badge>
                                ) : null}
                              </div>
                              {memberSupplies.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No open supply shares for this roommate.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {memberSupplies.map((share) => {
                                    const isChecked = supplySelections.some((item) => item.id === share.id)
                                    const createdDate = share.createdAt
                                      ? new Date(share.createdAt)
                                      : null
                                    const createdDateLabel =
                                      createdDate && !Number.isNaN(createdDate.getTime())
                                        ? format(createdDate, "MMM d")
                                        : null
                                    return (
                                      <label
                                        key={share.id}
                                        className="flex items-start gap-3 rounded-md border p-3 text-sm shadow-sm transition hover:border-primary"
                                      >
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={(value) =>
                                            handleSupplyToggle(index, share, value === true)
                                          }
                                          disabled={isPending}
                                        />
                                        <span className="space-y-1">
                                          <span className="block font-medium">
                                            {share.label}
                                            <span className="ml-2 font-normal text-muted-foreground">
                                              ${share.amount.toFixed(2)}
                                            </span>
                                          </span>
                                          <span className="block text-xs text-muted-foreground">
                                            {share.billingMonth
                                              ? `Month ${share.billingMonth}`
                                              : "Uncategorized"}
                                            {createdDateLabel ? ` • added ${createdDateLabel}` : ""}
                                          </span>
                                        </span>
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-6 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Draft total</span>
                              <span className="text-base font-semibold">
                                ${invoiceTotal.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">Rent ${ (selectedMembers[index]?.rentAmount ?? 0).toFixed(2) }</Badge>
                              <Badge variant="outline">Supplies ${ supplyTotal.toFixed(2) }</Badge>
                            </div>
                          </CardFooter>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending || selectedMembers.length === 0}>
                  {isPending ? "Creating drafts…" : "Create drafts"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent draft & open invoices</CardTitle>
          <CardDescription>
            Track the most recent invoices that still need to be sent or collected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              No draft or open invoices yet. Create one above to see it here.
            </p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{invoice.memberName}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.billingMonth} · Due {invoice.dueDate}
                    </p>
                    {invoice.memo ? (
                      <p className="text-xs text-muted-foreground">Memo: {invoice.memo}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">${invoice.totalAmount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      Rent ${(invoice.rentAmount ?? 0).toFixed(2)} · Supplies ${(invoice.supplyTotal ?? 0).toFixed(2)}
                    </div>
                    <Badge className="mt-1" variant="secondary">
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
