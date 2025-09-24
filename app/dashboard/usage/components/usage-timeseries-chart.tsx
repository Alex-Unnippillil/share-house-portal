'use client'

import { useMemo } from 'react'

import { ANALYTICS_EVENT_COLORS, ANALYTICS_EVENT_LABELS } from '@/lib/analytics/constants'
import type { AnalyticsEventType, TimeseriesPoint } from '@/lib/analytics/types'

const chartHeight = 100
const verticalPadding = 12
const plotHeight = chartHeight - verticalPadding * 2

const numberFormatter = new Intl.NumberFormat('en-US')

type UsageTimeseriesChartProps = {
  data: TimeseriesPoint[]
  series: AnalyticsEventType[]
}

export default function UsageTimeseriesChart({ data, series }: UsageTimeseriesChartProps) {
  const { maxValue, paths, markers } = useMemo(() => buildSeries(data, series), [data, series])

  const ticks = useMemo(() => {
    if (maxValue === 0) {
      return [0]
    }

    const segments = Math.min(4, Math.max(2, Math.ceil(maxValue / 5)))
    return new Array(segments).fill(null).map((_, index) => {
      const value = Math.round((maxValue / (segments - 1)) * index)
      return { value, y: verticalPadding + plotHeight - (plotHeight * (value / Math.max(maxValue, 1))) }
    })
  }, [maxValue])

  const firstDate = data.at(0)?.date
  const midDate = data.at(Math.floor(data.length / 2))?.date
  const lastDate = data.at(-1)?.date

  return (
    <div className="space-y-4">
      <svg
        viewBox={`0 0 100 ${chartHeight}`}
        className="h-64 w-full overflow-visible"
        role="img"
        aria-label="Key resident actions over time"
      >
        <g className="stroke-border/50" strokeDasharray="2 3">
          {ticks.map((tick) => (
            <line key={tick.value} x1={0} x2={100} y1={tick.y} y2={tick.y} strokeWidth={0.5} />
          ))}
        </g>

        {paths.map(({ eventType, d }) => (
          <path key={eventType} d={d} fill="none" stroke={ANALYTICS_EVENT_COLORS[eventType]} strokeWidth={1.6} />
        ))}

        {markers.map(({ eventType, x, y, value }) => (
          <g key={`${eventType}-${x}`}>
            <circle cx={x} cy={y} r={1.1} fill={ANALYTICS_EVENT_COLORS[eventType]} />
            <text x={x} y={y - 3} textAnchor="middle" className="fill-foreground text-[3px]">
              {value}
            </text>
          </g>
        ))}

        <g className="fill-muted-foreground text-[3px]">
          {ticks.map((tick) => (
            <text key={`label-${tick.value}`} x={1} y={tick.y - 1}>
              {numberFormatter.format(tick.value)}
            </text>
          ))}
        </g>
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-3">
          {series.map((eventType) => (
            <span key={eventType} className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: ANALYTICS_EVENT_COLORS[eventType] }} />
              <span>{ANALYTICS_EVENT_LABELS[eventType]}</span>
            </span>
          ))}
        </div>

        <div className="flex gap-4">
          {firstDate && <span>{formatDateLabel(firstDate)}</span>}
          {midDate && data.length > 2 && <span>{formatDateLabel(midDate)}</span>}
          {lastDate && <span>{formatDateLabel(lastDate)}</span>}
        </div>
      </div>
    </div>
  )
}

type ChartComputation = {
  maxValue: number
  paths: { eventType: AnalyticsEventType; d: string }[]
  markers: { eventType: AnalyticsEventType; x: number; y: number; value: number }[]
}

function buildSeries(data: TimeseriesPoint[], series: AnalyticsEventType[]): ChartComputation {
  if (data.length === 0 || series.length === 0) {
    return { maxValue: 0, paths: [], markers: [] }
  }

  const maxValue = series.reduce((currentMax, eventType) => {
    return Math.max(currentMax, ...data.map((point) => point.counts[eventType] ?? 0))
  }, 0)

  const safeMax = Math.max(maxValue, 1)
  const step = data.length > 1 ? 100 / (data.length - 1) : 0

  const paths: ChartComputation['paths'] = []
  const markers: ChartComputation['markers'] = []

  for (const eventType of series) {
    const coordinates = data.map((point, index) => {
      const value = point.counts[eventType] ?? 0
      const x = data.length > 1 ? index * step : 0
      const y = verticalPadding + plotHeight - (plotHeight * value) / safeMax
      return { x, y, value }
    })

    const d = coordinates
      .map((coordinate, index) => `${index === 0 ? 'M' : 'L'}${coordinate.x} ${coordinate.y}`)
      .join(' ')

    paths.push({ eventType, d })

    coordinates.forEach((coordinate) => {
      if (coordinate.value > 0) {
        markers.push({ eventType, x: coordinate.x, y: coordinate.y, value: coordinate.value })
      }
    })
  }

  return { maxValue, paths, markers }
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

function formatDateLabel(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`))
}
