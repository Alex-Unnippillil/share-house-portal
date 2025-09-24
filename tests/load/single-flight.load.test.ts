import { performance } from "node:perf_hooks"
import { describe, expect, it } from "vitest"

import { clearSingleFlightCache, singleFlight, sleep } from "@/lib/utils"

const describeLoad = process.env.RUN_LOAD_TEST === "1" ? describe : describe.skip

describeLoad("singleFlight load test", () => {
  it("handles bursts of concurrent requests", async () => {
    clearSingleFlightCache()

    const concurrency = 200
    let executions = 0

    const worker = async () => {
      executions += 1
      await sleep(10)
      return "ok"
    }

    const start = performance.now()
    const tasks = Array.from({ length: concurrency }, () =>
      singleFlight("load-test", worker)
    )

    const results = await Promise.all(tasks)
    const duration = performance.now() - start

    expect(results).toEqual(Array(concurrency).fill("ok"))
    expect(executions).toBe(1)

    console.log(
      `singleFlight load test: ${concurrency} concurrent calls => ${executions} execution in ${duration.toFixed(
        2
      )}ms`
    )

    clearSingleFlightCache()
  })
})
