import { describe, expect, it } from 'vitest'

import { toCsv } from '@/lib/operations/data'

describe('toCsv', () => {
  it('escapes commas, quotes, and newlines while preserving header order', () => {
    const csv = toCsv([
      {
        name: 'Alex, Kim',
        note: 'Said "hello"\nnext line',
        amount: 1200,
      },
    ])

    expect(csv).toBe('name,note,amount\n"Alex, Kim","Said ""hello""\nnext line","1200"')
  })

  it('returns an empty string for empty rows and normalizes nullish values', () => {
    expect(toCsv([])).toBe('')

    const csv = toCsv([
      {
        payment_id: 'pay-1',
        note: undefined,
        comment: null,
      },
    ])

    expect(csv).toBe('payment_id,note,comment\n"pay-1","",""')
  })
})
