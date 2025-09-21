import { useMemo, useState } from 'react'
import { addMinutes, format, formatISO, isPast, isSameDay, setHours, setMilliseconds, setMinutes, setSeconds, startOfDay } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import { z } from 'zod'

import { useFormState, useFormStatus } from 'react-dom'
import { scheduleMeetingAction } from '@/app/schedule/actions'

type AmenityOption = {
  id: string
  name: string
  description: string | null
  amenity_type: string
  requires_approval: boolean
}

type ClientValidationErrors = z.inferFlattenedErrors<typeof clientScheduleSchema>['fieldErrors']

type ScheduleFormProps = {
  userEmail: string
  userName: string
  amenities: AmenityOption[]
}

type ActionState = {
  message: string | null
  error: string | null
  success: boolean
  googleEventLink?: string | null
}

const clientScheduleSchema = z.object({
  startDateTime: z
    .date({ invalid_type_error: 'Invalid date or time selected.', required_error: 'Please select both a date and a time slot.' })
    .refine((date) => !isPast(date), {
      message: 'The selected time slot has already passed. Please select a future time.',
    }),
})

const initialState: ActionState = {
  message: null,
  error: null,
  success: false,
  googleEventLink: null,
}

const MEETING_DURATION_MINUTES = 60
const AVAILABLE_HOURS_START = 9
const AVAILABLE_HOURS_END = 17

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  const isDisabled = pending || disabled

  return (
    <button
      type="submit"
      aria-disabled={isDisabled}
      disabled={isDisabled}
      className={`rounded px-6 py-2 font-semibold text-white ${
        isDisabled ? 'cursor-not-allowed bg-gray-400' : 'bg-green-500 hover:bg-green-600'
      }`}
    >
      {pending ? 'Scheduling…' : 'Schedule Reservation'}
    </button>
  )
}

export function ScheduleForm({ userEmail, userName, amenities }: ScheduleFormProps) {
  const [serverState, formAction] = useFormState(scheduleMeetingAction, initialState)
  const [selectedAmenityId, setSelectedAmenityId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | undefined>(undefined)
  const [clientErrors, setClientErrors] = useState<ClientValidationErrors | null>(null)
  const [amenityError, setAmenityError] = useState<string | null>(null)

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return []

    const slots: string[] = []
    const today = startOfDay(new Date())
    const selectedDayStart = startOfDay(selectedDate)

    for (let hour = AVAILABLE_HOURS_START; hour < AVAILABLE_HOURS_END; hour++) {
      const slotStartTime = setMilliseconds(setSeconds(setMinutes(setHours(selectedDate, hour), 0), 0), 0)

      if (isSameDay(selectedDayStart, today) && isPast(slotStartTime)) {
        continue
      }

      slots.push(format(slotStartTime, 'HH:mm'))
    }

    return slots
  }, [selectedDate])

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    setSelectedTimeSlot(undefined)
    setClientErrors(null)
  }

  const handleTimeSelect = (slot: string) => {
    setSelectedTimeSlot(slot)
    setClientErrors(null)
  }

  const handleAmenitySelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAmenityId(event.target.value)
    setAmenityError(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setClientErrors(null)

    if (!selectedAmenityId) {
      setAmenityError('Please select an amenity to reserve.')
      return
    }

    let startDateTime: Date | null = null
    let endDateTime: Date | null = null

    if (selectedDate && selectedTimeSlot) {
      try {
        const [hour, minute] = selectedTimeSlot.split(':').map(Number)

        if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
          startDateTime = setMilliseconds(setSeconds(setMinutes(setHours(selectedDate, hour), minute), 0), 0)
          endDateTime = addMinutes(startDateTime, MEETING_DURATION_MINUTES)
        } else {
          startDateTime = new Date('invalid date')
        }
      } catch {
        startDateTime = new Date('invalid date')
      }
    }

    const validationResult = clientScheduleSchema.safeParse({ startDateTime })

    if (!validationResult.success) {
      setClientErrors(validationResult.error.flatten().fieldErrors)
      return
    }

    const startTimeISO = formatISO(validationResult.data.startDateTime)
    const endTimeISO = formatISO(endDateTime!)

    const form = new FormData()
    form.append('amenityId', selectedAmenityId)
    form.append('startTime', startTimeISO)
    form.append('endTime', endTimeISO)
    form.append('userEmail', userEmail)
    form.append('userName', userName)
    form.append('summary', `Reservation with ${userName}`)
    form.append('description', `Scheduled via app for ${format(validationResult.data.startDateTime, 'PPP p')}`)

    formAction(form)
  }

  const isSubmitDisabled = !selectedDate || !selectedTimeSlot || !selectedAmenityId || amenities.length === 0
  const dateTimeClientError = clientErrors?.startDateTime?.[0]

  const css = `
    .rdp {
      --rdp-accent-color: #16a34a;
      --rdp-accent-background-color: rgba(34, 197, 94, 0.15);
      margin: 0;
    }
    .rdp-day_selected,
    .rdp-day_selected:focus-visible,
    .rdp-day_selected:hover {
      background-color: var(--rdp-accent-color);
      border-color: var(--rdp-accent-color);
      color: white;
    }
  `

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-6">
      {serverState?.message && (
        <p
          className={`rounded p-3 text-sm ${
            serverState.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {serverState.message}
          {serverState.success && serverState.googleEventLink && (
            <a href={serverState.googleEventLink} target="_blank" rel="noopener noreferrer" className="ml-2 font-semibold underline">
              View Event
            </a>
          )}
        </p>
      )}

      {serverState?.error && (
        <p className="rounded bg-red-100 p-3 text-sm text-red-800">Server Error: {serverState.error}</p>
      )}

      {amenities.length === 0 ? (
        <div className="rounded border border-yellow-300 bg-yellow-100 p-3 text-sm text-yellow-800">
          No reservable amenities are configured for your building yet.
        </div>
      ) : (
        <div>
          <label className="mb-2 block text-lg font-semibold text-gray-800" htmlFor="amenity">
            1. Select an Amenity
          </label>
          <select
            id="amenity"
            name="amenity"
            className="w-full rounded border border-gray-300 p-2"
            value={selectedAmenityId}
            onChange={handleAmenitySelect}
          >
            <option value="">Choose an amenity…</option>
            {amenities.map((amenity) => (
              <option key={amenity.id} value={amenity.id}>
                {amenity.name} {amenity.requires_approval ? '(Approval required)' : ''}
              </option>
            ))}
          </select>
          {amenityError && <p className="mt-2 text-sm text-red-600">{amenityError}</p>}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-lg font-semibold text-gray-800">2. Select a Date</h3>
        <style>{css}</style>
        <DayPicker
          mode="single"
          required
          selected={selectedDate}
          onSelect={handleDateSelect}
          fromDate={new Date()}
          footer={selectedDate ? `Selected date: ${format(selectedDate, 'PPP')}` : 'Please pick a day.'}
          className="rounded-md bg-white shadow"
          aria-describedby={dateTimeClientError ? 'datetime-client-error' : undefined}
        />
      </div>

      {selectedDate && (
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800">3. Select a Time Slot</h3>
          {availableTimeSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {availableTimeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleTimeSelect(slot)}
                  className={`rounded border p-2 text-center text-sm font-medium transition-colors duration-150 ease-in-out ${
                    selectedTimeSlot === slot
                      ? 'border-green-700 bg-green-600 text-white ring-2 ring-green-300'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-100'
                  }`}
                  aria-describedby={dateTimeClientError ? 'datetime-client-error' : undefined}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : (
            <p className="italic text-gray-500">No available time slots for the selected date.</p>
          )}
          {dateTimeClientError && (
            <p id="datetime-client-error" className="mt-2 text-sm text-red-600">
              {dateTimeClientError}
            </p>
          )}
        </div>
      )}

      <div className="pt-4">
        <SubmitButton disabled={isSubmitDisabled} />
      </div>
    </form>
  )
}
