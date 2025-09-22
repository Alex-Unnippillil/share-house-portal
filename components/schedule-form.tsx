'use client';

import { useMemo, useState } from 'react';
import { scheduleMeetingAction } from '@/app/schedule/actions';
import { useFormState, useFormStatus } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { z } from 'zod';
import {
  format,
  formatISO,
  addMinutes,
  subMinutes,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isPast,
  isSameDay,
  startOfDay,
  isValid,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// --- Zod Schema for Client-Side Validation ---
const clientScheduleSchema = z.object({
  startDateTime: z
    .date({
      invalid_type_error: 'Invalid date or time selected.',
      required_error: 'Please select both a date and a time slot.',
    })
    .refine((date) => isValid(date), {
      message: 'Invalid date/time combination.',
    })
    .refine((date) => !isPast(date), {
      message: 'The selected time slot has already passed. Please select a future time.',
    }),
});

// Type for flattened Zod errors specifically for our schema structure
type ClientValidationErrors = z.inferFlattenedErrors<typeof clientScheduleSchema>['fieldErrors'];

interface ScheduleFormProps {
  userEmail: string;
  userName: string;
}

const initialState: {
  message: string | null;
  error: string | null;
  success: boolean;
  googleEventLink?: string | null;
} = {
  message: null,
  error: null,
  success: false,
  googleEventLink: null,
};

const MEETING_DURATION_MINUTES = 60;
const AVAILABLE_HOURS_START = 9;
const AVAILABLE_HOURS_END = 17;
const DEFAULT_BUFFER_MINUTES = 15;
const BUFFER_OPTIONS = [0, 10, 15, 20, 30, 45];
const AMENITIES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'tv-lounge', label: 'TV Lounge' },
  { value: 'parking', label: 'Parking Spot' },
  { value: 'gaming', label: 'Gaming Nook' },
  { value: 'shared-office', label: 'Shared Office' },
];

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <Button type="submit" aria-disabled={isDisabled} disabled={isDisabled}>
      {pending ? 'Reserving…' : 'Reserve Slot'}
    </Button>
  );
}

export function ScheduleForm({ userEmail, userName }: ScheduleFormProps) {
  const [serverState, formAction] = useFormState(scheduleMeetingAction, initialState);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | undefined>(undefined);
  const [selectedAmenity, setSelectedAmenity] = useState<string>(AMENITIES[0]?.value ?? '');
  const [bufferMinutes, setBufferMinutes] = useState<number>(DEFAULT_BUFFER_MINUTES);
  const [clientErrors, setClientErrors] = useState<ClientValidationErrors | null>(null);

  const selectedAmenityLabel = useMemo(
    () => AMENITIES.find((amenity) => amenity.value === selectedAmenity)?.label ?? 'Amenity',
    [selectedAmenity],
  );

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const slots: string[] = [];
    const today = startOfDay(new Date());
    const selectedDayStart = startOfDay(selectedDate);
    for (let hour = AVAILABLE_HOURS_START; hour < AVAILABLE_HOURS_END; hour++) {
      const slotStartTime = setMilliseconds(setSeconds(setMinutes(setHours(selectedDate, hour), 0), 0), 0);
      if (isSameDay(selectedDayStart, today) && isPast(slotStartTime)) {
        continue;
      }
      slots.push(format(slotStartTime, 'HH:mm'));
    }
    return slots;
  }, [selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTimeSlot(undefined);
    setClientErrors(null);
  };

  const handleTimeSelect = (slot: string) => {
    setSelectedTimeSlot(slot);
    setClientErrors(null);
  };

  const previewTimes = useMemo(() => {
    if (!selectedDate || !selectedTimeSlot) return null;
    const [hour, minute] = selectedTimeSlot.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

    const startDate = setMilliseconds(setSeconds(setMinutes(setHours(selectedDate, hour), minute), 0), 0);
    const endDate = addMinutes(startDate, MEETING_DURATION_MINUTES);

    return {
      start: startDate,
      end: endDate,
      bufferStart: subMinutes(startDate, bufferMinutes),
      bufferEnd: addMinutes(endDate, bufferMinutes),
    };
  }, [selectedDate, selectedTimeSlot, bufferMinutes]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientErrors(null);

    let startDateTime: Date | null = null;
    let endDateTime: Date | null = null;

    if (selectedDate && selectedTimeSlot) {
      try {
        const [hour, minute] = selectedTimeSlot.split(':').map(Number);
        if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
          startDateTime = setMilliseconds(setSeconds(setMinutes(setHours(selectedDate, hour), minute), 0), 0);
          endDateTime = addMinutes(startDateTime, MEETING_DURATION_MINUTES);
        } else {
          startDateTime = new Date('invalid date');
        }
      } catch (error) {
        console.error('Error constructing date:', error);
        startDateTime = new Date('invalid date');
      }
    }

    const validationResult = clientScheduleSchema.safeParse({ startDateTime });

    if (!validationResult.success) {
      setClientErrors(validationResult.error.flatten().fieldErrors);
      return;
    }

    const startTimeISO = formatISO(validationResult.data.startDateTime);
    const endTimeISO = formatISO(endDateTime!);

    const formData = new FormData();
    formData.append('startTime', startTimeISO);
    formData.append('endTime', endTimeISO);
    formData.append('amenitySlug', selectedAmenity);
    formData.append('bufferMinutes', bufferMinutes.toString());
    formData.append('userEmail', userEmail);
    formData.append('userName', userName);
    formData.append('summary', `Amenity booking – ${selectedAmenityLabel}`);
    formData.append(
      'description',
      `Scheduled via App by ${userEmail} for ${format(validationResult.data.startDateTime, 'PPP p')} with a ${bufferMinutes}-minute buffer.`,
    );

    formAction(formData);
  };

  const isSubmitDisabled = !selectedDate || !selectedTimeSlot || !selectedAmenity;
  const dateTimeClientError = clientErrors?.startDateTime?.[0];

  const css = `
    .rdp { /* ... same styles ... */ }
    /* ... other rdp styles ... */
  `;

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
            <a
              href={serverState.googleEventLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 font-semibold underline"
            >
              View Event
            </a>
          )}
        </p>
      )}
      {serverState?.error && (
        <p className="rounded bg-red-100 p-3 text-sm text-red-800">Server Error: {serverState.error}</p>
      )}

      {clientErrors && !dateTimeClientError && (
        <div className="rounded border border-yellow-300 bg-yellow-100 p-3 text-sm text-yellow-800">
          Please correct the errors indicated below.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800">Choose an amenity</h3>
          <Select value={selectedAmenity} onValueChange={setSelectedAmenity}>
            <SelectTrigger aria-label="Amenity">
              <SelectValue placeholder="Select an amenity" />
            </SelectTrigger>
            <SelectContent>
              {AMENITIES.map((amenity) => (
                <SelectItem key={amenity.value} value={amenity.value}>
                  {amenity.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800">Spacing buffer</h3>
          <Select value={String(bufferMinutes)} onValueChange={(value) => setBufferMinutes(Number(value))}>
            <SelectTrigger aria-label="Buffer minutes">
              <SelectValue placeholder="Select buffer" />
            </SelectTrigger>
            <SelectContent>
              {BUFFER_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            We automatically hold {bufferMinutes} minutes before and after this booking to avoid overlaps.
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-lg font-semibold text-gray-800">1. Select a Date</h3>
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
          <h3 className="mb-2 text-lg font-semibold text-gray-800">2. Select a Time Slot</h3>
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
            <p className="italic text-gray-500">
              No available time slots for the selected date based on predefined hours.
            </p>
          )}
          {dateTimeClientError && (
            <p id="datetime-client-error" className="mt-2 text-sm text-red-600">
              {dateTimeClientError}
            </p>
          )}
          {previewTimes && (
            <div className="mt-4 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-center justify-between font-medium">
                <span>{format(previewTimes.bufferStart, 'p')}</span>
                <span>{format(previewTimes.bufferEnd, 'p')}</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-amber-200"
                  style={{ flex: Math.max(bufferMinutes, 0) }}
                  aria-label={`Buffer before booking: ${bufferMinutes} minutes`}
                />
                <div
                  className="bg-emerald-500"
                  style={{ flex: MEETING_DURATION_MINUTES }}
                  aria-label="Requested booking duration"
                />
                <div
                  className="bg-amber-200"
                  style={{ flex: Math.max(bufferMinutes, 0) }}
                  aria-label={`Buffer after booking: ${bufferMinutes} minutes`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Actual booking: {format(previewTimes.start, 'p')} – {format(previewTimes.end, 'p')}. Buffer holds the amenity from
                {` ${format(previewTimes.bufferStart, 'p')} to ${format(previewTimes.start, 'p')}`} and again from
                {` ${format(previewTimes.end, 'p')} to ${format(previewTimes.bufferEnd, 'p')}`}.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="pt-4">
        <SubmitButton disabled={isSubmitDisabled} />
      </div>
    </form>
  );
}
