import {
  addDays,
  addWeeks,
  format,
  isAfter,
  isValid,
  nextDay,
  parse,
  startOfDay,
} from "date-fns"

export type QuickAddIntent = "invoice" | "task"

export type ParsedQuickAddCommand = {
  intent: QuickAddIntent
  description: string
  amount?: number
  currency?: string
  dueDate?: string
}

export type QuickAddIssue = {
  field: "intent" | "amount" | "currency" | "dueDate"
  message: string
  severity: "error" | "warning"
}

export type QuickAddParsingResult = {
  data: Partial<ParsedQuickAddCommand>
  issues: QuickAddIssue[]
  isReady: boolean
}

const WEEKDAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
}

const STOP_WORDS = [" for ", " to ", " about ", " on ", " amount", " invoice", " task", " pay "]

function normaliseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function normaliseAmount(value: string) {
  const compact = value.replace(/\s+/g, "")
  if (compact.includes(",") && !compact.includes(".")) {
    return compact.replace(/,/g, ".")
  }

  return compact.replace(/,/g, "")
}

export function parseQuickAddCommand(
  raw: string,
  options: { now?: Date } = {}
): QuickAddParsingResult {
  const now = options.now ?? new Date()
  const input = normaliseWhitespace(raw)

  if (!input) {
    return {
      data: {},
      issues: [
        {
          field: "intent",
          message: "Start typing to create an invoice or task.",
          severity: "error",
        },
      ],
      isReady: false,
    }
  }

  const lower = input.toLowerCase()

  const issues: QuickAddIssue[] = []
  const data: Partial<ParsedQuickAddCommand> = {
    description: input,
  }

  const intent = detectIntent(lower)
  if (intent) {
    data.intent = intent
  } else {
    issues.push({
      field: "intent",
      message: "Mention whether this is an invoice or task.",
      severity: "error",
    })
  }

  const amountInfo = extractAmount(input)
  if (amountInfo?.amount !== undefined) {
    data.amount = amountInfo.amount
  }
  if (amountInfo?.currency) {
    data.currency = amountInfo.currency
  } else if (data.amount !== undefined && intent === "invoice") {
    data.currency = "USD"
    issues.push({
      field: "currency",
      message: "Assuming USD — include a currency code to override.",
      severity: "warning",
    })
  }

  const duePhrase = detectDuePhrase(input)
  if (duePhrase) {
    const dueDate = parseDueDate(duePhrase, now)
    if (dueDate) {
      data.dueDate = format(dueDate, "yyyy-MM-dd")
    } else {
      issues.push({
        field: "dueDate",
        message: `Couldn't understand the due date from "${duePhrase}".`,
        severity: "error",
      })
    }
  }

  if (data.intent === "invoice") {
    if (data.amount === undefined) {
      issues.push({
        field: "amount",
        message: "Invoices need an amount like $250 or 250 USD.",
        severity: "error",
      })
    }
    if (!data.dueDate) {
      issues.push({
        field: "dueDate",
        message: "Invoices need a clear due date.",
        severity: "error",
      })
    }
  }

  if (data.intent === "task" && !data.dueDate) {
    issues.push({
      field: "dueDate",
      message: "Tasks work best with a due date.",
      severity: "error",
    })
  }

  const isReady =
    issues.filter((issue) => issue.severity === "error").length === 0 &&
    Boolean(data.intent)

  return { data, issues, isReady }
}

function detectIntent(input: string): QuickAddIntent | undefined {
  if (/(invoice|payment|charge|bill|rent)/i.test(input)) {
    return "invoice"
  }

  if (/(task|todo|remind|follow up|follow-up|assign|schedule)/i.test(input)) {
    return "task"
  }

  return undefined
}

function extractAmount(
  input: string
): { amount: number; currency?: string } | undefined {
  const symbolMatch = /([$€£])\s*(\d+(?:[.,]\d{1,2})?)/.exec(input)
  if (symbolMatch) {
    const amount = Number(normaliseAmount(symbolMatch[2]))
    if (!Number.isNaN(amount)) {
      const currency = CURRENCY_SYMBOLS[symbolMatch[1]]
      return {
        amount,
        currency,
      }
    }
  }

  const codeMatch = /(\d+(?:[.,]\d{1,2})?)\s*(usd|eur|gbp|cad|aud|nzd|inr|jpy|cny|sgd|mxn|sek|nok|dkk|chf|zar)/i.exec(
    input
  )
  if (codeMatch) {
    const amount = Number(normaliseAmount(codeMatch[1]))
    if (!Number.isNaN(amount)) {
      const currency = codeMatch[2].toUpperCase()
      return {
        amount,
        currency,
      }
    }
  }

  const genericMatch = /(\d+(?:[.,]\d{1,2})?)/.exec(input)
  if (genericMatch) {
    const amount = Number(normaliseAmount(genericMatch[1]))
    if (!Number.isNaN(amount)) {
      return {
        amount,
      }
    }
  }

  return undefined
}

function detectDuePhrase(input: string): string | undefined {
  const lower = input.toLowerCase()

  const dueTriggers = ["due", "by", "before", "on"]
  for (const trigger of dueTriggers) {
    const keyword = `${trigger} `
    const index = lower.indexOf(keyword)
    if (index >= 0) {
      const phrase = input.slice(index + keyword.length)
      return trimAtStopWord(phrase)
    }
  }

  const relativeMatch = /(today|tomorrow|next\s+\w+|in\s+\d+\s+(?:days?|weeks?))/i.exec(input)
  if (relativeMatch) {
    return relativeMatch[0]
  }

  return undefined
}

function trimAtStopWord(phrase: string) {
  let candidate = phrase.trim()
  let cutIndex: number | undefined
  const lower = candidate.toLowerCase()
  for (const stopWord of STOP_WORDS) {
    const index = lower.indexOf(stopWord)
    if (index > 0) {
      cutIndex = cutIndex === undefined ? index : Math.min(cutIndex, index)
    }
  }

  if (cutIndex !== undefined) {
    candidate = candidate.slice(0, cutIndex)
  }

  return candidate.replace(/[.,]$/, "").trim()
}

function parseDueDate(phrase: string, now: Date): Date | undefined {
  const normalized = normaliseWhitespace(phrase.toLowerCase())

  if (normalized === "today") {
    return startOfDay(now)
  }

  if (normalized === "tomorrow") {
    return startOfDay(addDays(now, 1))
  }

  const inMatch = /^in\s+(\d+)\s+(day|days|week|weeks)$/.exec(normalized)
  if (inMatch) {
    const value = Number(inMatch[1])
    if (inMatch[2].startsWith("week")) {
      return startOfDay(addWeeks(now, value))
    }
    return startOfDay(addDays(now, value))
  }

  const nextWeekdayMatch = /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.exec(
    normalized
  )
  if (nextWeekdayMatch) {
    const weekday = WEEKDAY_NAME_TO_INDEX[nextWeekdayMatch[1]]
    return startOfDay(nextDay(now, weekday))
  }

  const weekdayMatch = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.exec(
    normalized
  )
  if (weekdayMatch) {
    const weekday = WEEKDAY_NAME_TO_INDEX[weekdayMatch[1]]
    const candidate = startOfDay(nextDay(addDays(now, -1), weekday))
    if (candidate.getTime() === startOfDay(now).getTime()) {
      return startOfDay(now)
    }
    if (!isAfter(candidate, now)) {
      return startOfDay(nextDay(now, weekday))
    }
    return candidate
  }

  const explicitDate = parseExplicitDate(normalized, now)
  if (explicitDate) {
    return explicitDate
  }

  return undefined
}

function parseExplicitDate(phrase: string, now: Date): Date | undefined {
  const formats = [
    "yyyy-MM-dd",
    "MMMM d, yyyy",
    "MMM d, yyyy",
    "d MMMM yyyy",
    "d MMM yyyy",
    "MMMM d yyyy",
    "MMM d yyyy",
    "MMMM d",
    "MMM d",
    "d MMMM",
    "d MMM",
    "MM/dd/yyyy",
    "M/d/yyyy",
    "MM/dd",
    "M/d",
  ]

  for (const formatString of formats) {
    const parsed = parse(phrase, formatString, now)
    if (isValid(parsed)) {
      let candidate = startOfDay(parsed)

      if (formatString === "MM/dd" || formatString === "M/d" || formatString === "MMMM d" || formatString === "MMM d" || formatString === "d MMMM" || formatString === "d MMM") {
        candidate = rollForwardToFuture(candidate, now)
      }

      if (isValid(candidate)) {
        return candidate
      }
    }
  }

  return undefined
}

function rollForwardToFuture(date: Date, now: Date) {
  if (isAfter(date, now) || date.getTime() === startOfDay(now).getTime()) {
    return date
  }

  const nextYear = new Date(date)
  nextYear.setFullYear(now.getFullYear() + 1)
  return startOfDay(nextYear)
}
