import { describe, expect, test, beforeEach, afterEach } from 'vitest'

import {
  buildRotatingAssignments,
  buildTorontoWasteIcsUrl,
  makeWasteAssignmentKey,
  normalizeTorontoAddress,
  parseTorontoWasteIcs,
} from '@/lib/integrations/toronto-waste'

describe('Toronto waste ICS parser', () => {
  test('parses all-day and timed pickups with materials', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//City of Toronto//Waste Calendar//EN
BEGIN:VEVENT
UID:abc-123@example.com
DTSTAMP:20240630T120000Z
SUMMARY:Green Bin (organics); Garbage
DTSTART;VALUE=DATE:20240702
DESCRIPTION:Set out green bin and garbage.
END:VEVENT
BEGIN:VEVENT
UID:def-456@example.com
DTSTAMP:20240630T120000Z
SUMMARY:Recycling; Garbage
DTSTART;TZID=America/Toronto:20240709T070000
DESCRIPTION:Recycling and garbage pickup.\nRinse the bins afterwards.
END:VEVENT
END:VCALENDAR`

    const events = parseTorontoWasteIcs(ics)
    expect(events).toHaveLength(2)

    const [allDay, timed] = events
    expect(allDay.date).toBe('2024-07-02')
    expect(allDay.allDay).toBe(true)
    expect(allDay.materials.length).toBeGreaterThanOrEqual(2)
    expect(allDay.materials).toEqual(
      expect.arrayContaining(['Green Bin (organics)', 'Garbage'])
    )
    expect(allDay.startDateTime).toBeNull()
    expect(allDay.raw.dtstart).toBe('20240702')

    expect(timed.date).toBe('2024-07-09')
    expect(timed.allDay).toBe(false)
    expect(timed.tzid).toBe('America/Toronto')
    expect(timed.startDateTime).toBe('2024-07-09T07:00:00')
    expect(timed.materials.length).toBeGreaterThanOrEqual(2)
    expect(timed.materials).toEqual(expect.arrayContaining(['Recycling', 'Garbage']))
    expect(timed.description).toBeTruthy()
    expect(timed.description).toContain('Recycling and garbage pickup')
  })

  test('handles folded lines and escaped characters', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Green Bin\\, Garbage; Yard Waste
DESCRIPTION:Bring out bin\\nDo not block driveway.
DTSTART;VALUE=DATE:20240716
END:VEVENT
END:VCALENDAR`

    const [event] = parseTorontoWasteIcs(ics)
    expect(event.summary).toBe('Green Bin, Garbage; Yard Waste')
    expect(event.materials).toEqual(
      expect.arrayContaining(['Green Bin', 'Garbage', 'Yard Waste'])
    )
    expect(event.description).toBe('Bring out bin\nDo not block driveway.')
  })
})

describe('Address normalization', () => {
  test('uppercases and collapses whitespace', () => {
    expect(normalizeTorontoAddress(' 123  Sample St., Apt #2 ')).toBe('123 SAMPLE ST APT 2')
  })
})

describe('Chore assignment rotation', () => {
  const roommates = [
    { id: '1', full_name: 'Alex', email: 'alex@example.com' },
    { id: '2', full_name: 'Jordan', email: 'jordan@example.com' },
    { id: '3', full_name: null, email: 'casey@example.com' },
  ]

  test('deterministically rotates through roommates', () => {
    const events = [
      { date: '2024-07-01', summary: 'Green Bin; Garbage' },
      { date: '2024-07-08', summary: 'Recycling; Garbage' },
      { date: '2024-07-15', summary: 'Green Bin; Garbage' },
      { date: '2024-07-22', summary: 'Recycling; Garbage' },
    ]

    const assignments = buildRotatingAssignments(events, roommates)
    expect(assignments.get(makeWasteAssignmentKey(events[0]))?.full_name).toBe('Alex')
    expect(assignments.get(makeWasteAssignmentKey(events[1]))?.email).toBe(
      'casey@example.com'
    )
    expect(assignments.get(makeWasteAssignmentKey(events[2]))?.full_name).toBe('Jordan')
    expect(assignments.get(makeWasteAssignmentKey(events[3]))?.full_name).toBe('Alex')
  })
})

describe('ICS URL builder', () => {
  const ORIGINAL_BASE = process.env.TORONTO_WASTE_ICS_BASE_URL

  beforeEach(() => {
    process.env.TORONTO_WASTE_ICS_BASE_URL =
      'https://example.com/collection?address={address}&year={year}&format=ics'
  })

  afterEach(() => {
    process.env.TORONTO_WASTE_ICS_BASE_URL = ORIGINAL_BASE
  })

  test('injects address and year placeholders', () => {
    const url = buildTorontoWasteIcsUrl('123 Sample St', { year: 2025 })
    expect(url).toBe(
      'https://example.com/collection?address=123%20Sample%20St&year=2025&format=ics'
    )
  })

  test('appends query params when placeholders are absent', () => {
    process.env.TORONTO_WASTE_ICS_BASE_URL = 'https://example.com/collection'
    const url = buildTorontoWasteIcsUrl('321 Queen St E', { year: 2024 })
    expect(url).toBe(
      'https://example.com/collection?address=321+Queen+St+E&year=2024&format=ics'
    )
  })
})
