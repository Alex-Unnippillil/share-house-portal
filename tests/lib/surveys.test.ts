import { describe, expect, it } from 'vitest'

import {
  buildMaintenanceCsatContext,
  CSAT_FLOW_MAINTENANCE,
  formatQuarterLabel,
  getQuarterWindow,
  shouldTriggerQuarterlyNps,
} from '@/lib/surveys'

describe('getQuarterWindow', () => {
  it('derives the correct window for each quarter', () => {
    const q1 = getQuarterWindow(new Date('2025-02-10T10:00:00Z'))
    expect(q1).toEqual({
      year: 2025,
      quarter: 1,
      startDate: '2025-01-01',
      endDate: '2025-03-31',
    })

    const q2 = getQuarterWindow(new Date('2025-05-03T05:00:00Z'))
    expect(q2).toEqual({
      year: 2025,
      quarter: 2,
      startDate: '2025-04-01',
      endDate: '2025-06-30',
    })

    const q3 = getQuarterWindow(new Date('2025-08-21T23:00:00Z'))
    expect(q3).toEqual({
      year: 2025,
      quarter: 3,
      startDate: '2025-07-01',
      endDate: '2025-09-30',
    })

    const q4 = getQuarterWindow(new Date('2025-11-05T00:00:00Z'))
    expect(q4).toEqual({
      year: 2025,
      quarter: 4,
      startDate: '2025-10-01',
      endDate: '2025-12-31',
    })
  })
})

describe('shouldTriggerQuarterlyNps', () => {
  it('requests feedback when no prior response exists', () => {
    expect(shouldTriggerQuarterlyNps(null, new Date('2025-02-01T00:00:00Z'))).toBe(true)
  })

  it('skips prompting when a response exists for the current quarter', () => {
    expect(
      shouldTriggerQuarterlyNps('2025-01-01', new Date('2025-02-15T00:00:00Z'))
    ).toBe(false)
  })

  it('re-prompts when the previous quarter is complete', () => {
    expect(
      shouldTriggerQuarterlyNps('2024-10-01', new Date('2025-02-15T00:00:00Z'))
    ).toBe(true)
  })
})

describe('formatQuarterLabel', () => {
  it('produces human readable quarter labels', () => {
    const label = formatQuarterLabel({
      year: 2025,
      quarter: 1,
      startDate: '2025-01-01',
      endDate: '2025-03-31',
    })

    expect(label).toBe('Q1 2025')
  })
})

describe('buildMaintenanceCsatContext', () => {
  it('namespaces maintenance feedback to avoid collisions', () => {
    expect(buildMaintenanceCsatContext('request-123')).toBe(
      `${CSAT_FLOW_MAINTENANCE}:request-123`
    )
  })
})
