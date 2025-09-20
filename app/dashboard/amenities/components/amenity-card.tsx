'use client'

import { useFormState, useFormStatus } from 'react-dom'

import { updateAmenityAction } from '@/app/dashboard/amenities/actions'
import type { Database } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const initialState = { success: false, message: '', error: '' }

type Amenity = Database['public']['Tables']['amenities']['Row']

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? 'Saving…' : 'Save changes'}
    </Button>
  )
}

interface AmenityCardProps {
  amenity: Amenity
}

export function AmenityCard({ amenity }: AmenityCardProps) {
  const [state, formAction] = useFormState(updateAmenityAction, initialState)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{amenity.name}</CardTitle>
        <CardDescription>Manage description, rules, and visibility.</CardDescription>
      </CardHeader>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={amenity.id} />
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor={`name-${amenity.id}`} className="text-sm font-medium">
              Name
            </label>
            <Input id={`name-${amenity.id}`} name="name" defaultValue={amenity.name} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor={`description-${amenity.id}`} className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id={`description-${amenity.id}`}
              name="description"
              defaultValue={amenity.description ?? ''}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor={`rules-${amenity.id}`} className="text-sm font-medium">
              Usage rules
            </label>
            <Textarea id={`rules-${amenity.id}`} name="rules" defaultValue={amenity.rules ?? ''} rows={4} />
          </div>
          <div className="grid gap-2">
            <label htmlFor={`is_active-${amenity.id}`} className="text-sm font-medium">
              Availability
            </label>
            <select
              id={`is_active-${amenity.id}`}
              name="is_active"
              defaultValue={amenity.is_active ? 'true' : 'false'}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="true">Visible to tenants</option>
              <option value="false">Hidden from tenant portal</option>
            </select>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && state.message && <p className="text-sm text-green-600">{state.message}</p>}
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  )
}
