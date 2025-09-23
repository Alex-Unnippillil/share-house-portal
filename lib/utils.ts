import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { resolveUserSettings, type UserSettingsOverrides } from "@/lib/user-settings"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init)

  if (!res.ok) {
    const json = await res.json()
    if (json.error) {
      const error = new Error(json.error) as Error & {
        status: number
      }
      error.status = res.status
      throw error
    } else {
      throw new Error('An unexpected error occurred')
    }
  }

  return res.json()
}

export interface FormatDateOptions extends UserSettingsOverrides {
  readonly formatOptions?: Intl.DateTimeFormatOptions
}

export function formatDate(input: string | number | Date, options?: FormatDateOptions): string {
  const date = new Date(input)
  const { locale } = resolveUserSettings({ locale: options?.locale })
  const formatOptions =
    options?.formatOptions ?? ({ month: "long", day: "numeric", year: "numeric" } as const)

  return new Intl.DateTimeFormat(locale, formatOptions).format(date)
}

export interface FormatNumberOptions extends UserSettingsOverrides {
  readonly style?: Intl.NumberFormatOptions["style"]
  readonly formatOptions?: Intl.NumberFormatOptions
}

export const formatNumber = (value: number, options?: FormatNumberOptions) => {
  const { locale, currency } = resolveUserSettings({
    locale: options?.locale,
    currency: options?.currency,
  })

  const baseOptions: Intl.NumberFormatOptions = options?.formatOptions
    ? { ...options.formatOptions }
    : { style: options?.style ?? "currency" }

  if (baseOptions.style === "currency" && !baseOptions.currency) {
    baseOptions.currency = currency
  }

  return new Intl.NumberFormat(locale, baseOptions).format(value)
}

export const runAsyncFnWithoutBlocking = (
  fn: (...args: any) => Promise<any>
) => {
  fn()
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const getStringFromBuffer = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

export enum ResultCode {
  InvalidCredentials = 'INVALID_CREDENTIALS',
  InvalidSubmission = 'INVALID_SUBMISSION',
  UserAlreadyExists = 'USER_ALREADY_EXISTS',
  UnknownError = 'UNKNOWN_ERROR',
  UserCreated = 'USER_CREATED',
  UserLoggedIn = 'USER_LOGGED_IN'
}

export const getMessageFromCode = (resultCode: string) => {
  switch (resultCode) {
    case ResultCode.InvalidCredentials:
      return 'Invalid credentials!'
    case ResultCode.InvalidSubmission:
      return 'Invalid submission, please try again!'
    case ResultCode.UserAlreadyExists:
      return 'User already exists, please log in!'
    case ResultCode.UserCreated:
      return 'User created, welcome!'
    case ResultCode.UnknownError:
      return 'Something went wrong, please try again!'
    case ResultCode.UserLoggedIn:
      return 'Logged in!'
  }
}