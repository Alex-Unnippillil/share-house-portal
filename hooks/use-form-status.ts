import { useCallback, useState } from "react"
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form"

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again."

type ErrorField<TFieldValues extends FieldValues> =
  | FieldPath<TFieldValues>
  | "root"

type UseFormStatusOptions<TFieldValues extends FieldValues> = {
  errorField?: ErrorField<TFieldValues>
  defaultErrorMessage?: string
}

export function useFormStatus<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  options: UseFormStatusOptions<TFieldValues> = {}
) {
  const [pending, setPending] = useState(false)
  const errorField = options.errorField ?? "root"
  const fallbackMessage = options.defaultErrorMessage ?? GENERIC_ERROR_MESSAGE

  const clearFormError = useCallback(() => {
    const clearErrors = form.clearErrors as (name?: any) => void
    clearErrors(errorField === "root" ? "root" : errorField)
  }, [form, errorField])

  const setFormError = useCallback(
    (message?: string) => {
      if (!message) {
        clearFormError()
        return
      }

      const setError = form.setError as (name: any, error: any) => void
      setError(errorField === "root" ? "root" : errorField, {
        type: "server",
        message,
      })
    },
    [clearFormError, errorField, form]
  )

  const withPending = useCallback(
    async <T>(action: () => Promise<T>) => {
      setPending(true)
      clearFormError()

      try {
        return await action()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : fallbackMessage

        setFormError(message)
        throw error
      } finally {
        setPending(false)
      }
    },
    [clearFormError, fallbackMessage, setFormError]
  )

  return {
    pending,
    setFormError,
    clearFormError,
    withPending,
  }
}
