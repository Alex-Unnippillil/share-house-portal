import { afterEach, describe, expect, it, vi } from "vitest"

import {
  HttpWebhookChannel,
  QueryWatchdog,
  SlackWebhookChannel,
  runQueryWatchdog,
} from "@/analytics/warehouse/guardrails"
import { DEFAULT_ESCALATION_POLICY } from "@/analytics/warehouse/guardrails/config"

const buildQueryEvent = (
  overrides: Partial<Parameters<QueryWatchdog["monitorQuery"]>[0]> = {},
) => ({
  queryId: "test-query",
  sql: "select * from users where signup_date > current_date - interval '30 days'",
  warehouse: "bigquery",
  runtimeMs: 750,
  bytesScanned: 32 * 1024,
  triggeredBy: "analyst@roomsily.test",
  startedAt: new Date("2024-06-01T12:00:00.000Z"),
  ...overrides,
})

describe("warehouse guardrails", () => {
  const fetchMock = vi.fn<
    [RequestInfo | URL, RequestInit?],
    Promise<Response>
  >(async () => new Response(null, { status: 200 }))

  afterEach(() => {
    fetchMock.mockClear()
  })

  it("does not fire alerts for lightweight queries", async () => {
    const watchdog = new QueryWatchdog()
    const slack = new SlackWebhookChannel({
      webhookUrl: "https://slack.invalid/webhook",
      fetchFn: fetchMock,
    })
    const webhook = new HttpWebhookChannel({
      url: "https://hooks.invalid/warehouse",
      fetchFn: fetchMock,
    })

    const result = await watchdog.monitorQuery(buildQueryEvent(), [
      slack,
      webhook,
    ])

    expect(result.triggered).toBe(false)
    expect(result.violations).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("escalates critical guardrails to Slack and downstream webhooks", async () => {
    const event = buildQueryEvent({
      queryId: "heavy-query",
      runtimeMs: 10 * 60 * 1_000,
      bytesScanned: 250 * 1024 ** 3,
    })

    const slack = new SlackWebhookChannel({
      webhookUrl: "https://slack.invalid/webhook",
      fetchFn: fetchMock,
    })
    const webhook = new HttpWebhookChannel({
      url: "https://hooks.invalid/warehouse",
      fetchFn: fetchMock,
    })

    const result = await runQueryWatchdog(event, [slack, webhook])

    expect(result.triggered).toBe(true)
    expect(result.alert?.severity).toBe("critical")
    expect(result.alert?.escalation).toEqual(DEFAULT_ESCALATION_POLICY.critical)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [slackCall, webhookCall] = fetchMock.mock.calls

    expect(slackCall?.[0]).toBe("https://slack.invalid/webhook")
    const slackBody = JSON.parse(slackCall?.[1]?.body as string)
    expect(slackBody.text).toContain("Critical")
    expect(slackBody.blocks[1].text.text).toContain("Runtime 10m")
    expect(slackBody.blocks[3].elements[0].text).toContain(
      "#analytics-incidents",
    )

    expect(webhookCall?.[0]).toBe("https://hooks.invalid/warehouse")
    const webhookBody = JSON.parse(webhookCall?.[1]?.body as string)
    expect(webhookBody.summary).toContain("heavy-query")
    expect(webhookBody.escalation.instructions).toContain("Incident.io")
    expect(webhookBody.violations).toHaveLength(2)
  })
})
