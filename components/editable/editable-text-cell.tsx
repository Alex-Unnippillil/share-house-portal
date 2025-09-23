'use client'

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { KeyboardEvent, KeyboardEventHandler } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type InlineSaveResult<T = unknown> = {
  success: boolean
  error?: string
  message?: string
  data?: T
}

export type EditableTextCellSaveHandler<T = unknown> = (
  value: string
) => Promise<InlineSaveResult<T>>

interface EditableTextCellProps<T = unknown> {
  id: string
  label: string
  value?: string | null
  onSave: EditableTextCellSaveHandler<T>
  placeholder?: string
  emptyPlaceholder?: string
  multiline?: boolean
  required?: boolean
  minLength?: number
  maxLength?: number
  className?: string
  displayClassName?: string
  inputClassName?: string
  editButtonLabel?: string
}

export function EditableTextCell<T = unknown>({
  id,
  label,
  value,
  onSave,
  placeholder,
  emptyPlaceholder,
  multiline = false,
  required = false,
  minLength,
  maxLength,
  className,
  displayClassName,
  inputClassName,
  editButtonLabel = 'Edit',
}: EditableTextCellProps<T>) {
  const [editing, setEditing] = useState(false)
  const [currentValue, setCurrentValue] = useState(() => value ?? '')
  const [draft, setDraft] = useState(() => value ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef(false)

  useEffect(() => {
    const nextValue = value ?? ''
    setCurrentValue(nextValue)
    setDraft(nextValue)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if ('select' in inputRef.current) {
        inputRef.current.select()
      }
    }
  }, [editing])

  const displayValue = useMemo(() => currentValue.trim(), [currentValue])

  const resolvedDisplay = displayValue.length > 0 ? currentValue : ''
  const showPlaceholder = resolvedDisplay.length === 0

  const runValidation = (candidate: string) => {
    const trimmed = candidate.trim()

    if (required && trimmed.length === 0) {
      return 'This field is required.'
    }

    if (minLength && trimmed.length < minLength) {
      return `Must be at least ${minLength} characters.`
    }

    if (maxLength && trimmed.length > maxLength) {
      return `Must be ${maxLength} characters or fewer.`
    }

    return null
  }

  const closeEditor = () => {
    setEditing(false)
    setError(null)
    restoreFocusRef.current = true
  }

  const handleSave = () => {
    const trimmed = multiline ? draft.trim() : draft.trim()
    const validationMessage = runValidation(multiline ? draft : trimmed)

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    const nextValue = multiline ? draft : trimmed

    if (nextValue === currentValue) {
      closeEditor()
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const result = await onSave(nextValue)
        if (result.success) {
          setCurrentValue(nextValue)
          setDraft(nextValue)
          closeEditor()
          return
        }

        setError(result.error ?? 'Unable to save changes.')
      } catch (actionError) {
        console.error('Failed to persist inline edit', actionError)
        setError('Unable to save changes.')
      }
    })
  }

  const handleCancel = () => {
    setDraft(currentValue)
    closeEditor()
  }

  useEffect(() => {
    if (!editing && restoreFocusRef.current) {
      restoreFocusRef.current = false
      const button = triggerRef.current
      if (button) {
        button.focus()
      }
    }
  }, [editing])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancel()
      return
    }

    if (!multiline && event.key === 'Enter') {
      event.preventDefault()
      handleSave()
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'whitespace-pre-wrap text-left',
              displayClassName,
              showPlaceholder && 'italic text-muted-foreground'
            )}
            aria-live="polite"
            data-testid={`${id}-value`}
          >
            {showPlaceholder ? emptyPlaceholder ?? placeholder ?? '—' : resolvedDisplay}
          </span>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            aria-label={`${editButtonLabel} ${label}`}
            onClick={() => {
              setEditing(true)
              setError(null)
            }}
          >
            {editButtonLabel}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-2" data-testid={`${id}-editor`}>
          {multiline ? (
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              id={id}
              aria-label={label}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown as KeyboardEventHandler<HTMLTextAreaElement>}
              placeholder={placeholder}
              className={cn('min-h-[6rem]', inputClassName)}
              maxLength={maxLength}
            />
          ) : (
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              id={id}
              aria-label={label}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown as KeyboardEventHandler<HTMLInputElement>}
              placeholder={placeholder}
              className={inputClassName}
              maxLength={maxLength}
            />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={pending}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
