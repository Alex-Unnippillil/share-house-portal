import { createCompressedJsonResponse } from '@/lib/http/compression'

const repeatedMessage =
  'Shared housing logistics thrive on concise updates; this sentence is intentionally repeated to evaluate compression performance.'

function buildPayload() {
  return {
    status: 'ok',
    description:
      'Provides a deterministic payload for verifying gzip and brotli compression behaviours in automated checks.',
    notes: Array.from({ length: 25 }, () => repeatedMessage),
  }
}

export async function GET(request: Request) {
  return createCompressedJsonResponse(request, buildPayload())
}

export async function POST(request: Request) {
  return createCompressedJsonResponse(request, buildPayload())
}
