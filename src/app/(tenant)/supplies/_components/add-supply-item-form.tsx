'use client'

import { useState, useTransition, FormEvent } from 'react'
import { Plus, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

import { addSupplyItem } from '../actions'

export function AddSupplyItemForm() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      name: (formData.get('name') as string | null)?.trim() ?? '',
      quantity: (formData.get('quantity') as string | null)?.trim() ?? undefined,
      category: (formData.get('category') as string | null)?.trim() ?? undefined,
      notes: (formData.get('notes') as string | null)?.trim() ?? undefined,
    }

    startTransition(async () => {
      const result = await addSupplyItem(payload)

      if (!result.success) {
        toast({
          title: 'Could not add item',
          description: result.error ?? 'Please try again.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Item added',
        description: result.message ?? 'The household shopping list has been updated.',
      })

      form.reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" aria-hidden />
          Add item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to the shopping list</DialogTitle>
          <DialogDescription>
            Log what needs to be restocked so roommates know what to grab on the next run.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item name</Label>
            <Input id="name" name="name" placeholder="Paper towels" required disabled={isPending} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity or size</Label>
              <Input
                id="quantity"
                name="quantity"
                placeholder="2 rolls"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="Cleaning" disabled={isPending} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Check for the eco-friendly brand if available"
              disabled={isPending}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              Save item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
