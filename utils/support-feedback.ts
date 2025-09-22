export type SupportFeedbackStatus = 'pending' | 'resolved' | 'escalated'

export interface SupportFeedbackPayload {
  source: string
  action: string
  status: SupportFeedbackStatus
  description?: string
  metadata?: Record<string, unknown>
}

export async function recordSupportFeedback(
  payload: SupportFeedbackPayload
) {
  try {
    const response = await fetch('/api/support-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      console.error('Failed to record support feedback', errorBody)
    }
  } catch (error) {
    console.error('Support feedback logging error:', error)
  }
}
