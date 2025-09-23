'use client'

import { useState } from 'react'

import { TemplatesGallery } from '@/components/templates/TemplatesGallery'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { applyTemplatePrefill, clearLastTemplateChoice, loadLastTemplateChoice, saveLastTemplateChoice } from '@/lib/templates'
import type { TemplateRecord, TemplateSelectionMeta } from '@/types/templates'
import { toast } from 'sonner'

type OnboardingFormState = {
  full_name: string
  unit: string
  rent_share: string
  move_in_date: string
  emergency_contact: {
    name: string
    phone: string
  }
  vehicle_information: string
  notes: string
}

const TEMPLATE_FIELDS = [
  'full_name',
  'unit',
  'rent_share',
  'move_in_date',
  'emergency_contact',
  'vehicle_information',
  'notes',
] as const satisfies readonly (keyof OnboardingFormState & string)[]

const createEmptyForm = (): OnboardingFormState => ({
  full_name: '',
  unit: '',
  rent_share: '',
  move_in_date: '',
  emergency_contact: {
    name: '',
    phone: '',
  },
  vehicle_information: '',
  notes: '',
})

export function TenantOnboardingForm() {
  const [formState, setFormState] = useState<OnboardingFormState>(() => createEmptyForm())
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() =>
    loadLastTemplateChoice('onboarding'),
  )

  const handleTemplateSelect = (template: TemplateRecord, meta: TemplateSelectionMeta) => {
    setFormState((previous) =>
      applyTemplatePrefill(previous, template, {
        allowedKeys: TEMPLATE_FIELDS,
      }),
    )
    setSelectedTemplateId(template.id)

    if (meta.source === 'manual') {
      saveLastTemplateChoice('onboarding', template.id)
    }
  }

  const handleTemplateClear = () => {
    setSelectedTemplateId(null)
    clearLastTemplateChoice('onboarding')
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    toast.success('Onboarding details captured', {
      description: 'The prefilled information has been staged for review.',
    })
  }

  const handleFieldChange = (field: keyof OnboardingFormState, value: string) => {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const handleEmergencyContactChange = (
    field: keyof OnboardingFormState['emergency_contact'],
    value: string,
  ) => {
    setFormState((previous) => ({
      ...previous,
      emergency_contact: {
        ...previous.emergency_contact,
        [field]: value,
      },
    }))
  }

  const handleReset = () => {
    setFormState(createEmptyForm())
    setSelectedTemplateId(null)
    clearLastTemplateChoice('onboarding')
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Household onboarding</CardTitle>
        <CardDescription>
          Use curated templates to jump start resident intake and complete the required onboarding
          checklist in minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Start from a template</Label>
          <TemplatesGallery
            context="onboarding"
            defaultTemplateId={selectedTemplateId}
            onSelect={handleTemplateSelect}
            onClear={handleTemplateClear}
          />
          <p className="text-xs text-muted-foreground">
            Selecting a template will populate the intake form with example unit assignments,
            emergency contacts, and household notes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={formState.full_name}
                onChange={(event) => handleFieldChange('full_name', event.target.value)}
                placeholder="Jordan Rivers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formState.unit}
                onChange={(event) => handleFieldChange('unit', event.target.value)}
                placeholder="2B"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rent_share">Monthly rent share</Label>
              <Input
                id="rent_share"
                type="number"
                min="0"
                step="0.01"
                value={formState.rent_share}
                onChange={(event) => handleFieldChange('rent_share', event.target.value)}
                placeholder="950"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="move_in_date">Move-in date</Label>
              <Input
                id="move_in_date"
                type="date"
                value={formState.move_in_date}
                onChange={(event) => handleFieldChange('move_in_date', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Emergency contact name</Label>
              <Input
                id="emergency_contact_name"
                value={formState.emergency_contact.name}
                onChange={(event) => handleEmergencyContactChange('name', event.target.value)}
                placeholder="Jamie Lee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Emergency contact phone</Label>
              <Input
                id="emergency_contact_phone"
                value={formState.emergency_contact.phone}
                onChange={(event) => handleEmergencyContactChange('phone', event.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicle_information">Vehicle information</Label>
              <Input
                id="vehicle_information"
                value={formState.vehicle_information}
                onChange={(event) => handleFieldChange('vehicle_information', event.target.value)}
                placeholder="Blue Honda Civic - License 7ABC123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Household notes</Label>
              <Textarea
                id="notes"
                value={formState.notes}
                onChange={(event) => handleFieldChange('notes', event.target.value)}
                rows={4}
                placeholder="Allergic to pets, prefers email communication."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Save onboarding details</Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              Reset form
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
