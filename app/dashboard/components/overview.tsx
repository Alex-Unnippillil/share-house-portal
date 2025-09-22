"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

export type OverviewDatum = {
  label: string
  value: number
}

interface OverviewProps {
  data: OverviewDatum[]
}

export function Overview({ data }: OverviewProps) {
  if (!data.length) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center text-sm text-muted-foreground">
        No streak history yet. Complete your chores to build momentum.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="label"
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
          allowDecimals={false}
          tickFormatter={(value) => `${value}d`}
        />
        <Bar
          dataKey="value"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
