"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"
import {
  DayPicker,
  Day,
  WeekNumber,
  type DayProps,
  type MonthsProps,
  type RowProps,
  useDayPicker,
  useFocusContext,
} from "react-day-picker"
import { getUnixTime, isSameDay } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

type VirtualizationRange = { start: number; end: number }

type CalendarVirtualizationValue = {
  containerRef: React.RefObject<HTMLDivElement>
  beginRender: () => void
  endRender: () => void
  registerRow: (key: string) => number
  reportRowHeight: (height: number) => void
  handleScroll: () => void
  isRowVisible: (index: number) => boolean
  getEstimatedRowHeight: () => number
}

const CalendarVirtualizationContext =
  React.createContext<CalendarVirtualizationValue | null>(null)

function useCalendarVirtualizationContext() {
  const context = React.useContext(CalendarVirtualizationContext)
  if (!context) {
    throw new Error(
      "Calendar virtualization context must be used within its provider."
    )
  }
  return context
}

const MIN_ROW_HEIGHT = 44

function useCalendarVirtualization({
  overscan = 1,
  estimate = 48,
}: { overscan?: number; estimate?: number } = {}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const rowOrderRef = React.useRef<string[]>([])
  const totalRowsRef = React.useRef(0)
  const rowHeightRef = React.useRef(estimate)
  const [visibleRange, setVisibleRange] = React.useState<VirtualizationRange>(
    () => ({ start: 0, end: Number.POSITIVE_INFINITY })
  )

  const recalcVisibleRange = React.useCallback(() => {
    const container = containerRef.current
    const totalRows = totalRowsRef.current
    if (!container || totalRows === 0) {
      setVisibleRange({ start: 0, end: totalRows ? totalRows - 1 : 0 })
      return
    }

    const rowHeight = rowHeightRef.current || estimate
    if (!rowHeight) {
      setVisibleRange({ start: 0, end: totalRows - 1 })
      return
    }

    const scrollTop = container.scrollTop
    const viewportHeight = container.clientHeight
    const start = Math.max(
      Math.floor(scrollTop / rowHeight) - overscan,
      0
    )
    const end = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
    )
    setVisibleRange({ start, end })
  }, [estimate, overscan])

  const beginRender = React.useCallback(() => {
    rowOrderRef.current = []
  }, [])

  const registerRow = React.useCallback((key: string) => {
    const index = rowOrderRef.current.length
    rowOrderRef.current.push(key)
    return index
  }, [])

  const endRender = React.useCallback(() => {
    totalRowsRef.current = rowOrderRef.current.length
    recalcVisibleRange()
  }, [recalcVisibleRange])

  const reportRowHeight = React.useCallback(
    (height: number) => {
      if (!height) return
      if (Math.abs(rowHeightRef.current - height) > 0.5) {
        rowHeightRef.current = height
        recalcVisibleRange()
      }
    },
    [recalcVisibleRange]
  )

  const handleScroll = React.useCallback(() => {
    recalcVisibleRange()
  }, [recalcVisibleRange])

  const isRowVisible = React.useCallback(
    (index: number) => {
      const { start, end } = visibleRange
      if (end === Number.POSITIVE_INFINITY) {
        return true
      }
      return index >= start && index <= end
    },
    [visibleRange]
  )

  const getEstimatedRowHeight = React.useCallback(() => {
    return rowHeightRef.current || estimate
  }, [estimate])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => {
      recalcVisibleRange()
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [recalcVisibleRange])

  React.useEffect(() => {
    recalcVisibleRange()
  }, [recalcVisibleRange])

  return React.useMemo<CalendarVirtualizationValue>(
    () => ({
      containerRef,
      beginRender,
      endRender,
      registerRow,
      reportRowHeight,
      handleScroll,
      isRowVisible,
      getEstimatedRowHeight,
    }),
    [
      beginRender,
      endRender,
      handleScroll,
      isRowVisible,
      registerRow,
      reportRowHeight,
      getEstimatedRowHeight,
    ]
  )
}

const MemoizedDay = React.memo(function MemoizedDay(props: DayProps) {
  return <Day {...props} />
}, areDayPropsEqual)

function areDayPropsEqual(prev: DayProps, next: DayProps) {
  return (
    prev.date.getTime() === next.date.getTime() &&
    prev.displayMonth.getTime() === next.displayMonth.getTime()
  )
}

function VirtualizedMonths({ children }: MonthsProps) {
  const virtualization = useCalendarVirtualizationContext()
  const { classNames, styles } = useDayPicker()

  virtualization.beginRender()

  React.useLayoutEffect(() => {
    virtualization.endRender()
  }, [virtualization])

  return (
    <div
      ref={virtualization.containerRef}
      className={cn(
        classNames.months,
        "max-h-[26rem] overflow-y-auto overscroll-contain"
      )}
      style={styles.months}
      onScroll={virtualization.handleScroll}
    >
      {children}
    </div>
  )
}

function VirtualizedRow(props: RowProps) {
  const { styles, classNames, showWeekNumber, components } = useDayPicker()
  const virtualization = useCalendarVirtualizationContext()
  const { focusedDay } = useFocusContext()

  const DayComponent = components?.Day ?? MemoizedDay
  const WeekNumberComponent = components?.WeekNumber ?? WeekNumber

  const rowRef = React.useRef<HTMLTableRowElement>(null)

  const rowKey = React.useMemo(
    () => `${props.displayMonth.getFullYear()}-${props.displayMonth.getMonth()}-${props.weekNumber}`,
    [props.displayMonth, props.weekNumber]
  )

  const rowIndex = virtualization.registerRow(rowKey)
  const estimatedRowHeight = Math.max(
    virtualization.getEstimatedRowHeight(),
    MIN_ROW_HEIGHT
  )

  const containsFocusedDay = React.useMemo(() => {
    if (!focusedDay) return false
    return props.dates.some((date) => isSameDay(date, focusedDay))
  }, [focusedDay, props.dates])

  const shouldRenderCells =
    virtualization.isRowVisible(rowIndex) || containsFocusedDay

  React.useLayoutEffect(() => {
    if (!shouldRenderCells) return
    if (!rowRef.current) return
    virtualization.reportRowHeight(rowRef.current.getBoundingClientRect().height)
  }, [shouldRenderCells, virtualization])

  React.useEffect(() => {
    if (!containsFocusedDay) return
    const container = virtualization.containerRef.current
    const rowEl = rowRef.current
    if (!container || !rowEl) return

    const containerRect = container.getBoundingClientRect()
    const rowRect = rowEl.getBoundingClientRect()

    if (rowRect.top < containerRect.top) {
      container.scrollTop += rowRect.top - containerRect.top
    } else if (rowRect.bottom > containerRect.bottom) {
      container.scrollTop += rowRect.bottom - containerRect.bottom
    }
  }, [containsFocusedDay, virtualization])

  const weekNumberCell = showWeekNumber ? (
    <td
      className={classNames.cell}
      style={{ ...styles.cell, minHeight: estimatedRowHeight }}
    >
      {shouldRenderCells ? (
        <WeekNumberComponent number={props.weekNumber} dates={props.dates} />
      ) : (
        <div aria-hidden="true" style={{ height: estimatedRowHeight }} />
      )}
    </td>
  ) : null

  return (
    <tr
      ref={rowRef}
      className={classNames.row}
      style={{ ...styles.row, minHeight: estimatedRowHeight }}
    >
      {weekNumberCell}
      {props.dates.map((date) => {
        const key = getUnixTime(date)
        return (
          <td
            key={key}
            className={classNames.cell}
            style={{ ...styles.cell, minHeight: estimatedRowHeight }}
            role="presentation"
          >
            {shouldRenderCells ? (
              <DayComponent displayMonth={props.displayMonth} date={date} />
            ) : (
              <div aria-hidden="true" style={{ height: estimatedRowHeight }} />
            )}
          </td>
        )
      })}
    </tr>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  ...props
}: CalendarProps) {
  const virtualization = useCalendarVirtualization()

  const mergedComponents = React.useMemo(() => {
    const { IconLeft, IconRight, ...restComponents } = userComponents ?? {}

    return {
      ...restComponents,
      IconLeft:
        IconLeft ??
        (({ className: iconClassName, ...iconProps }) => (
          <ChevronLeftIcon
            aria-hidden="true"
            className={cn("size-4", iconClassName)}
            {...iconProps}
          />
        )),
      IconRight:
        IconRight ??
        (({ className: iconClassName, ...iconProps }) => (
          <ChevronRightIcon
            aria-hidden="true"
            className={cn("size-4", iconClassName)}
            {...iconProps}
          />
        )),
      Months: VirtualizedMonths,
      Row: VirtualizedRow,
      Day: MemoizedDay,
    }
  }, [userComponents])

  return (
    <CalendarVirtualizationContext.Provider value={virtualization}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: cn(
            "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
            props.mode === "range"
              ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
              : "[&:has([aria-selected])]:rounded-md"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "size-8 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_start: "day-range-start",
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50  aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={mergedComponents}
        {...props}
      />
    </CalendarVirtualizationContext.Provider>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
