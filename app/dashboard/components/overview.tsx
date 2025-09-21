"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { MonthlyCollectionPoint } from "../lib/types"

type OverviewProps = {
  data: MonthlyCollectionPoint[]
}

export function Overview({ data }: OverviewProps) {
  const chartData = data.length
    ? data
    : Array.from({ length: 6 }, (_, index) => ({
        month: `M${index + 1}`,
        collected: 0,
      }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="month"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          cursor={{ fill: "rgba(59,130,246,0.12)" }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Collected"]}
        />
        <Bar
          dataKey="collected"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}