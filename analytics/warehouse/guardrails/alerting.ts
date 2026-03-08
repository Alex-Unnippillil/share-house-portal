import { AlertDispatcher, GuardrailAlert } from "./types"

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

const resolveFetch = (fetchFn?: FetchLike): FetchLike => {
  if (fetchFn) {
    return fetchFn
  }

  if (typeof fetch !== "undefined") {
    return fetch
  }

  throw new Error("No fetch implementation available for alert delivery")
}

interface SlackWebhookOptions {
  webhookUrl: string
  fetchFn?: FetchLike
  username?: string
  iconEmoji?: string
}

export class SlackWebhookChannel implements AlertDispatcher {
  private readonly fetchFn: FetchLike

  constructor(private readonly options: SlackWebhookOptions) {
    this.fetchFn = resolveFetch(options.fetchFn)
  }

  async deliver(alert: GuardrailAlert): Promise<void> {
    const severityEmoji = alert.severity === "critical" ? ":rotating_light:" : ":warning:"
    const payload = {
      text: `${severityEmoji} ${alert.summary}`,
      username: this.options.username ?? "Warehouse Guardrails",
      icon_emoji: this.options.iconEmoji ?? ":chart_with_downwards_trend:",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${severityEmoji} ${alert.summary}*`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: alert.details,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Query ID*\n${alert.query.queryId}`,
            },
            {
              type: "mrkdwn",
              text: `*Warehouse*\n${alert.query.warehouse}`,
            },
            {
              type: "mrkdwn",
              text: `*Triggered By*\n${alert.query.triggeredBy}`,
            },
            alert.query.dataset
              ? {
                  type: "mrkdwn" as const,
                  text: `*Dataset*\n${alert.query.dataset}`,
                }
              : undefined,
          ].filter(Boolean),
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Escalate to: ${alert.escalation.notify.join(", ")}`,
            },
            {
              type: "mrkdwn",
              text: alert.escalation.instructions,
            },
          ],
        },
      ],
    }

    await this.fetchFn(this.options.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  }
}

interface HttpWebhookOptions {
  url: string
  fetchFn?: FetchLike
  headers?: Record<string, string>
}

export class HttpWebhookChannel implements AlertDispatcher {
  private readonly fetchFn: FetchLike

  constructor(private readonly options: HttpWebhookOptions) {
    this.fetchFn = resolveFetch(options.fetchFn)
  }

  async deliver(alert: GuardrailAlert): Promise<void> {
    await this.fetchFn(this.options.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.options.headers,
      },
      body: JSON.stringify(alert),
    })
  }
}

export const fanOutAlerts = async (
  alert: GuardrailAlert,
  dispatchers: AlertDispatcher[],
): Promise<void> => {
  const deliveries = await Promise.allSettled(
    dispatchers.map((dispatcher) => dispatcher.deliver(alert)),
  )

  const failures = deliveries.filter(
    (delivery): delivery is PromiseRejectedResult => delivery.status === "rejected",
  )

  if (failures.length) {
    const error = failures[0].reason instanceof Error
      ? failures[0].reason
      : new Error(String(failures[0].reason))
    throw error
  }
}
