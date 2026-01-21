import type { Database } from "@/lib/supabase"

export type MessageFlagStatus =
  Database["public"]["Tables"]["message_flags"]["Row"]["status"]

export type ModerationAction = "flag" | "hide" | "escalate" | "resolve"

export interface EscalationStep {
  action: ModerationAction
  previousStatus: MessageFlagStatus
  nextStatus: MessageFlagStatus
}

export interface EscalationSimulationResult {
  finalStatus: MessageFlagStatus
  steps: EscalationStep[]
}

function clampStatus(status: MessageFlagStatus): MessageFlagStatus {
  return status
}

export function transitionFlagStatus(
  currentStatus: MessageFlagStatus,
  action: ModerationAction
): MessageFlagStatus {
  switch (action) {
    case "flag":
      return "open"
    case "hide":
      if (currentStatus === "resolved") {
        return "resolved"
      }
      return "hidden"
    case "escalate":
      if (currentStatus === "resolved") {
        return "resolved"
      }
      return "escalated"
    case "resolve":
      return "resolved"
    default: {
      const exhaustiveCheck: never = action
      return exhaustiveCheck
    }
  }
}

export function simulateEscalationFlow(
  initialStatus: MessageFlagStatus,
  actions: ModerationAction[]
): EscalationSimulationResult {
  const steps: EscalationStep[] = []
  let current = clampStatus(initialStatus)

  for (const action of actions) {
    const next = transitionFlagStatus(current, action)
    steps.push({ action, previousStatus: current, nextStatus: next })
    current = next
  }

  return {
    finalStatus: current,
    steps,
  }
}
