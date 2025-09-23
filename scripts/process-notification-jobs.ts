import { processNotificationJobs } from "@/lib/notification-queue"

function parseBatchSize() {
  const raw = process.env.NOTIFICATION_JOB_BATCH_SIZE
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

async function main() {
  const limit = parseBatchSize()
  const start = Date.now()
  const result = await processNotificationJobs({ limit })
  const durationMs = Date.now() - start

  console.info("Notification worker completed", {
    processed: result.processed,
    durationMs,
    retries: result.results.filter((entry) => entry.status === "retry-scheduled")
      .length,
    deadLetters: result.results.filter((entry) => entry.status === "dead-letter")
      .length,
  })

  const deadLetterJobs = result.results.filter(
    (entry) => entry.status === "dead-letter"
  )

  if (deadLetterJobs.length > 0) {
    console.error("Jobs moved to dead-letter queue", deadLetterJobs)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error("Notification worker failed", error)
  process.exit(1)
})
