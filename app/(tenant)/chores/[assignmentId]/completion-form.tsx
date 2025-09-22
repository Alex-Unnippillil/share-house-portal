'use client'

import React, { useMemo, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { Database } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import useSupabaseBrowser from '@/utils/supabase-browser'

import { completeChore } from './actions'

type ChoreStatus = Database['public']['Enums']['chore_status']

type CompleteChoreFormProps = {
  assignmentId: string
  status: ChoreStatus
  creditValue: number
  initialProofUrl: string | null
  initialProofPublicUrl?: string | null
  bucket?: string
}

const DEFAULT_BUCKET = 'docs'

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_')
}

export function CompleteChoreForm({
  assignmentId,
  status,
  creditValue,
  initialProofUrl,
  initialProofPublicUrl,
  bucket = DEFAULT_BUCKET,
}: CompleteChoreFormProps) {
  const supabase = useSupabaseBrowser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [currentStatus, setCurrentStatus] = useState<ChoreStatus>(status)
  const [proofUrl, setProofUrl] = useState<string | null>(initialProofUrl)
  const [proofPublicUrl, setProofPublicUrl] = useState<string | null>(initialProofPublicUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const disabled = useMemo(
    () => currentStatus === 'completed' || uploading || isPending,
    [currentStatus, uploading, isPending]
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) {
      return
    }

    setError(null)

    const file = fileInputRef.current?.files?.[0]
    let nextProofUrl: string | null = proofUrl

    if (file) {
      setUploading(true)
      try {
        const safeName = sanitizeFileName(file.name)
        const objectPath = `chore-proofs/${assignmentId}-${Date.now()}-${safeName}`
        const { data, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(objectPath, file)

        if (uploadError) {
          setError(uploadError.message)
          return
        }

        nextProofUrl = data?.path ?? objectPath
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(nextProofUrl)
        setProofUrl(nextProofUrl)
        setProofPublicUrl(publicUrlData.publicUrl)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : 'Unable to upload proof.'
        setError(message)
        return
      } finally {
        setUploading(false)
      }
    }

    startTransition(() => {
      completeChore({ assignmentId, proofUrl: nextProofUrl ?? null })
        .then((result) => {
          if (result?.error) {
            setError(result.error)
            return
          }

          setProofUrl(nextProofUrl ?? null)
          setCurrentStatus('completed')
          toast({
            title: 'Chore completed',
            description: creditValue
              ? `Nice work! ${creditValue} credits have been added to your balance.`
              : 'Nice work! Your chore has been marked as complete.',
          })
        })
        .catch((actionError) => {
          const message = actionError instanceof Error ? actionError.message : 'Unable to complete chore.'
          setError(message)
        })
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="complete-chore-form"
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="proof">Proof upload (optional)</Label>
        <Input
          ref={fileInputRef}
          id="proof"
          type="file"
          accept="image/*,application/pdf"
          aria-describedby="proof-helper"
          disabled={disabled}
        />
        <p id="proof-helper" className="text-sm text-muted-foreground">
          Attach a quick snapshot or PDF if you have one. You can also submit without proof.
        </p>
        {proofPublicUrl ? (
          <a
            className="text-sm text-primary underline"
            href={proofPublicUrl}
            rel="noreferrer"
            target="_blank"
          >
            View uploaded proof
          </a>
        ) : null}
      </div>

      {creditValue ? (
        <p className="rounded-md border border-dashed border-muted-foreground/40 bg-muted p-3 text-sm text-muted-foreground">
          Completing this chore will earn you <span className="font-medium text-foreground">{creditValue}</span> credits.
        </p>
      ) : null}

      {error ? <p className={cn('text-sm text-destructive')}>{error}</p> : null}

      <Button type="submit" disabled={disabled} className="self-start">
        {currentStatus === 'completed' ? 'Chore completed' : uploading ? 'Uploading…' : isPending ? 'Saving…' : 'Submit completion'}
      </Button>
    </form>
  )
}
