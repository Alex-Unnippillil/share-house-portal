'use client'

import { useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { markSupplyItemAcquired } from '../actions'

interface MarkAcquiredButtonProps {
  itemId: string
  itemName: string
}

export function MarkAcquiredButton({ itemId, itemName }: MarkAcquiredButtonProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await markSupplyItemAcquired({ itemId, itemName })

      if (!result.success) {
        toast({
          title: 'Could not mark as acquired',
          description: result.error ?? 'Please try again.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Marked as acquired',
        description: result.message ?? `${itemName} has been moved to recent purchases.`,
      })
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
      {isPending ? 'Saving…' : 'Mark acquired'}
    </Button>
  )
}
