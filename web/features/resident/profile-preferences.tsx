'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { ResidentProfile } from './api'
import { useResidentProfile, useUpdateResidentPreferences } from './hooks'

const preferenceFields: Array<{
  key: keyof ResidentProfile['preferences']
  label: string
  description: string
}> = [
  {
    key: 'emailNotifications',
    label: 'Email notifications',
    description: 'Receive account and event notifications at your registered email address.',
  },
  {
    key: 'smsNotifications',
    label: 'SMS alerts',
    description: 'Get urgent updates via text message for maintenance and safety notices.',
  },
  {
    key: 'maintenanceUpdates',
    label: 'Maintenance updates',
    description: 'Stay in the loop when a work order you submitted changes status.',
  },
  {
    key: 'newsletterOptIn',
    label: 'Community newsletter',
    description: 'Opt in to the monthly newsletter with building highlights and events.',
  },
]

export const ResidentProfilePreferences = () => {
  const { data, isLoading, isError, error } = useResidentProfile()
  const updatePreferences = useUpdateResidentPreferences()

  const handleToggle = (key: (typeof preferenceFields)[number]['key'], checked: boolean) => {
    const payload: Partial<ResidentProfile['preferences']> = { [key]: checked }
    updatePreferences.mutate(payload)
  }

  return (
    <Card aria-labelledby="profile-preferences-heading">
      <CardHeader>
        <CardTitle id="profile-preferences-heading" className="text-xl">
          Profile & preferences
        </CardTitle>
        <CardDescription>Manage how we contact you and who to reach in case of emergencies.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            Loading profile settings…
          </p>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            {(error as Error).message || 'Unable to load your resident profile.'}
          </p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">No profile information is available.</p>
        ) : (
          <>
            <section aria-labelledby="contact-info-heading" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="contact-info-heading" className="text-base font-semibold">
                  Contact information
                </h3>
                <Badge variant="secondary">Unit {data.unit}</Badge>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Resident</dt>
                  <dd className="font-medium text-foreground">{data.name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
                  <dd className="font-medium text-foreground">{data.email}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Phone</dt>
                  <dd className="font-medium text-foreground">{data.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Emergency contact</dt>
                  <dd className="font-medium text-foreground">
                    {data.emergencyContact.name} · {data.emergencyContact.phone}
                  </dd>
                </div>
              </dl>
            </section>

            <Separator />

            <section aria-labelledby="communication-preferences-heading" className="space-y-4">
              <h3 id="communication-preferences-heading" className="text-base font-semibold">
                Communication preferences
              </h3>
              <ul className="space-y-4">
                {preferenceFields.map(field => {
                  const switchId = `preference-${field.key}`
                  const checked = data.preferences[field.key]

                  return (
                    <li key={field.key} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Label htmlFor={switchId} className="text-sm font-semibold text-foreground">
                            {field.label}
                          </Label>
                          <p id={`${switchId}-description`} className="text-sm text-muted-foreground">
                            {field.description}
                          </p>
                        </div>
                        <Switch
                          id={switchId}
                          checked={checked}
                          onCheckedChange={value => handleToggle(field.key, value)}
                          disabled={updatePreferences.isPending}
                          aria-describedby={`${switchId}-description`}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )}

        {updatePreferences.isError && (
          <p role="alert" className="text-sm text-destructive">
            {(updatePreferences.error as Error)?.message || 'Unable to update your preferences right now.'}
          </p>
        )}
        {updatePreferences.isSuccess && (
          <p role="status" aria-live="polite" className="text-sm text-emerald-600">
            Preferences updated successfully.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
