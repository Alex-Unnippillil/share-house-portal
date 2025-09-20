'use client'

import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { createAmenityAction } from '@/app/dashboard/amenities/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const initialState = { success: false, message: '', error: '' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create amenity'}
    </Button>
  )
}

export function CreateAmenityForm() {
  const [state, formAction] = useFormState(createAmenityAction, initialState)
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
    }
  }, [state.success])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a new amenity</CardTitle>
        <CardDescription>Provide details and optional house rules for tenants.</CardDescription>
      </CardHeader>
      <form ref={formRef} action={formAction} className="space-y-4">
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input id="name" name="name" required placeholder="Gym, co-working room, rooftop grill…" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea id="description" name="description" rows={3} placeholder="Brief overview shown to tenants." />
          </div>
          <div className="grid gap-2">
            <label htmlFor="rules" className="text-sm font-medium">
              Usage rules (one per line)
            </label>
            <Textarea id="rules" name="rules" rows={4} placeholder={'Wipe down equipment after use\nReturn key within 15 minutes'} />
          </div>
          <div className="grid gap-2">
            <label htmlFor="is_active" className="text-sm font-medium">
              Availability
            </label>
            <select
              id="is_active"
              name="is_active"
              defaultValue="true"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="true">Visible to tenants</option>
              <option value="false">Hidden from tenant portal</option>
            </select>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && state.message && <p className="text-sm text-green-600">{state.message}</p>}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  )
}
