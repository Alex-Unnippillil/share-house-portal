import { describe, expect, it } from "vitest"

import {
  simulateEscalationFlow,
  transitionFlagStatus,
  type MessageFlagStatus,
} from "@/lib/messaging/escalation"

describe("messaging moderation escalation", () => {
  it("escalates an open flag to escalated state", () => {
    const next = transitionFlagStatus("open", "escalate")

    expect(next).toBe("escalated")
  })

  it("keeps resolved flags resolved when additional actions run", () => {
    const statuses: MessageFlagStatus[] = []
    const actions: ("hide" | "escalate" | "resolve")[] = [
      "resolve",
      "escalate",
      "hide",
    ]

    let current: MessageFlagStatus = "open"

    for (const action of actions) {
      current = transitionFlagStatus(current, action)
      statuses.push(current)
    }

    expect(statuses).toEqual(["resolved", "resolved", "resolved"])
  })

  it("simulates a full escalation workflow and records each step", () => {
    const { finalStatus, steps } = simulateEscalationFlow("open", [
      "escalate",
      "hide",
      "resolve",
    ])

    expect(finalStatus).toBe("resolved")
    expect(steps).toEqual([
      { action: "escalate", previousStatus: "open", nextStatus: "escalated" },
      { action: "hide", previousStatus: "escalated", nextStatus: "hidden" },
      { action: "resolve", previousStatus: "hidden", nextStatus: "resolved" },
    ])
  })
})
