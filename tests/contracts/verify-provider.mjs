import { readdir } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const pactPackagePath = require.resolve("@pact-foundation/pact/package.json")
const pactCorePath = path.resolve(path.dirname(pactPackagePath), "../pact-core/src/verifier/index.js")
const { Verifier } = require(pactCorePath)

const resolvePactPaths = async () => {
  const directory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "pacts"
  )

  const entries = await readdir(directory).catch((error) => {
    if (error && (error.code === "ENOENT" || error.code === "ENOTDIR")) {
      return []
    }
    throw error
  })

  return entries
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => path.join(directory, entry))
}

const run = async () => {
  const pactUrls = await resolvePactPaths()

  if (pactUrls.length === 0) {
    console.error("No pact files were found. Did you run the consumer tests?")
    process.exitCode = 1
    return
  }

  const providerBaseUrl = process.env.PACT_PROVIDER_URL ?? "http://127.0.0.1:3001"
  console.log(`Verifying provider at ${providerBaseUrl}`)
  console.log(`Using pacts: ${pactUrls.join(', ')}`)

  const verifier = new Verifier({
    provider: "RoomsilyApi",
    providerBaseUrl,
    pactUrls,
    logLevel: (process.env.PACT_LOG_LEVEL ?? "warn"),
  })

  try {
    const output = await verifier.verify()
    console.log(output)
  } catch (error) {
    console.error("Pact verification failed", error)
    process.exitCode = 1
  }
}

run()
