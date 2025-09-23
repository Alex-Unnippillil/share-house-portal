"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import type { RegisterOptions } from "react-hook-form"

import { cn } from "@/lib/utils"

type Option = {
        label: string
        value: string
}

type EditableCellFormValues = {
        value: string
}

export type EditableCellProps = {
        /**
         * Accessible label describing the field rendered inside the table cell.
         */
        label: string
        /**
         * Current value for the cell. The component will keep itself in sync when
         * this value changes as a result of optimistic updates completing.
         */
        value: string
        /**
         * Callback invoked when a new value is submitted. Return a promise to
         * surface async validation errors inline.
         */
        onSubmit: (value: string) => Promise<void> | void
        /**
         * Optional collection of options to render the editor as a select input.
         */
        options?: Option[]
        /**
         * Optional placeholder rendered for text inputs.
         */
        placeholder?: string
        /**
         * Validation rules forwarded to react-hook-form.
         */
        rules?: RegisterOptions<EditableCellFormValues, "value">
        /**
         * Render prop for the read-only state. Defaults to the raw value.
         */
        renderDisplay?: (value: string) => React.ReactNode
        /**
         * Applies styles to the wrapper element.
         */
        className?: string
        /**
         * When true the cell stays interactive but visually indicates an
         * in-flight update.
         */
        pending?: boolean
}

const DEFAULT_ERROR_MESSAGE = "Unable to save changes"

export default function EditableCell({
        label,
        value,
        options,
        onSubmit,
        placeholder,
        rules,
        renderDisplay,
        className,
        pending = false,
}: EditableCellProps) {
        const {
                handleSubmit,
                formState,
                register,
                reset,
        } = useForm<EditableCellFormValues>({
                defaultValues: { value },
        })

        const [isEditing, setIsEditing] = useState(false)
        const [serverError, setServerError] = useState<string | null>(null)
        const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

        const displayLabel = useMemo(() => {
                if (!options) return value
                return options.find((option) => option.value === value)?.label ?? value
        }, [options, value])

        useEffect(() => {
                if (isEditing) {
                        return
                }
                reset({ value })
        }, [isEditing, reset, value])

        useEffect(() => {
                if (!isEditing) return

                const id = requestAnimationFrame(() => {
                        inputRef.current?.focus()
                })
                return () => cancelAnimationFrame(id)
        }, [isEditing])

        const closeEditor = () => {
                reset({ value })
                setServerError(null)
                setIsEditing(false)
        }

        const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
                if (event.key === "Escape") {
                        event.preventDefault()
                        closeEditor()
                        return
                }

                if (event.key === "Enter") {
                        event.preventDefault()
                        void onValidSubmit()
                }
        }

        const onValidSubmit = handleSubmit(async ({ value: nextValue }) => {
                if (pending) return

                try {
                        await onSubmit(nextValue)
                        setServerError(null)
                        setIsEditing(false)
                } catch (error) {
                        if (error instanceof Error && error.message) {
                                setServerError(error.message)
                        } else {
                                setServerError(DEFAULT_ERROR_MESSAGE)
                        }
                }
        })

        const field = register("value", rules)

        return (
                <div
                        className={cn("relative w-full", className)}
                        aria-busy={pending}
                        data-pending={pending ? "true" : undefined}
                >
                        {isEditing ? (
                                <form className="flex flex-col gap-1" onSubmit={onValidSubmit}>
                                        {options ? (
                                                <select
                                                        {...field}
                                                        ref={(element) => {
                                                                field.ref(element)
                                                                inputRef.current = element
                                                        }}
                                                        aria-label={label}
                                                        className={cn(
                                                                "w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm capitalize",
                                                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                                                        )}
                                                        disabled={pending}
                                                        onKeyDown={handleKeyDown}
                                                >
                                                        {options.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        ) : (
                                                <input
                                                        {...field}
                                                        ref={(element) => {
                                                                field.ref(element)
                                                                inputRef.current = element
                                                        }}
                                                        aria-label={label}
                                                        className={cn(
                                                                "w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm",
                                                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                                                        )}
                                                        disabled={pending}
                                                        onKeyDown={handleKeyDown}
                                                        placeholder={placeholder}
                                                />
                                        )}
                                        {formState.errors.value ? (
                                                <p className="text-xs text-red-500" role="alert">
                                                        {formState.errors.value.message as string}
                                                </p>
                                        ) : null}
                                        {serverError ? (
                                                <p className="text-xs text-red-500" role="alert">
                                                        {serverError}
                                                </p>
                                        ) : null}
                                </form>
                        ) : (
                                <button
                                        type="button"
                                        className={cn(
                                                "group/trigger w-full text-left text-sm",
                                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                                                pending ? "opacity-60" : undefined,
                                        )}
                                        aria-label={`${label}. Current value: ${displayLabel}`}
                                        onClick={() => {
                                                if (pending) return
                                                setServerError(null)
                                                setIsEditing(true)
                                        }}
                                        disabled={pending}
                                >
                                        <span aria-hidden="true">
                                                {renderDisplay ? renderDisplay(value) : displayLabel}
                                        </span>
                                </button>
                        )}
                </div>
        )
}
