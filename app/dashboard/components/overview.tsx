"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

import type { Database } from "@/lib/supabase"
import useSupabaseBrowser from "@/utils/supabase-browser"

type ChoreStatus = Database["public"]["Enums"]["chore_assignment_status"]
type StatusRow = Pick<Database["public"]["Tables"]["chore_assignments"]["Row"], "status">

type ChartDatum = {
  name: string
  total: number
}

const statusOrder: ChoreStatus[] = ["pending", "completed", "approved", "rejected"]

const statusLabels: Record<ChoreStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  approved: "Approved",
  rejected: "Rejected",
}

export function Overview({ tenantId }: { tenantId?: string | null }) {
  const supabase = useSupabaseBrowser()
  const [data, setData] = useState<ChartDatum[]>(() =>
    statusOrder.map((status) => ({ name: statusLabels[status], total: 0 })),
  )

  const loadStatusBreakdown = useCallback(async () => {
    let query = supabase.from("chore_assignments").select("status")
    if (tenantId) {
      query = query.eq("tenant_id", tenantId)
    }

    const { data: rows, error } = await query

    if (error) {
      console.error("Failed to load chore assignment breakdown", error)
      return
    }

    const result = statusOrder.map((status) => ({
      name: statusLabels[status],
      total: (rows ?? []).filter((row: StatusRow) => row.status === status).length,
    }))

    setData(result)
  }, [supabase, tenantId])

  useEffect(() => {
    void loadStatusBreakdown()
  }, [loadStatusBreakdown])

  useEffect(() => {
    const channel = supabase
      .channel(`overview-chore-assignments-${tenantId ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chore_assignments",
          ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}),
        },
        () => {
          void loadStatusBreakdown()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadStatusBreakdown, supabase, tenantId])

  const chartData = useMemo(() => data, [data])

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, "dataMax + 1"]}
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}