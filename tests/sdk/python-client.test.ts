import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const pythonPackageDir = path.resolve(__dirname, "../../sdk/python")
const requirementsPath = path.join(pythonPackageDir, "requirements.txt")
const pythonDepsDir = path.join(pythonPackageDir, ".deps")
const sentinelPath = path.join(pythonDepsDir, ".installed")

function ensurePythonDependencies() {
  const requirements = fs.readFileSync(requirementsPath, "utf8")
  const existing = fs.existsSync(sentinelPath)
    ? fs.readFileSync(sentinelPath, "utf8")
    : null

  if (existing === requirements) {
    return
  }

  fs.mkdirSync(pythonDepsDir, { recursive: true })
  const install = spawnSync(
    "python",
    [
      "-m",
      "pip",
      "install",
      "--quiet",
      "--target",
      pythonDepsDir,
      "-r",
      requirementsPath,
    ],
    { encoding: "utf8" }
  )

  if (install.status !== 0) {
    throw new Error(
      `Failed to install Python SDK dependencies: ${install.stderr || install.stdout}`
    )
  }

  fs.writeFileSync(sentinelPath, requirements)
}

describe("python sdk smoke", () => {
  beforeAll(async () => {
    ensurePythonDependencies()
  })

  it("retrieves documents and creates a checkout session", () => {
    const pythonPath = [
      pythonPackageDir,
      pythonDepsDir,
      process.env.PYTHONPATH,
    ]
      .filter(Boolean)
      .join(path.delimiter)

    const script = `import json, os\nfrom share_house_portal_sdk import Configuration, ApiClient\nfrom share_house_portal_sdk.api.default_api import DefaultApi\nfrom share_house_portal_sdk.models.checkout_session_request import CheckoutSessionRequest\nfrom share_house_portal_sdk.rest import RESTResponse\n\nBASE_URL = os.environ["SDK_BASE_URL"]\n\nclass _MockResponse:\n    def __init__(self, payload):\n        self.status = 200\n        self.reason = "OK"\n        self.headers = {"Content-Type": "application/json"}\n        self.data = json.dumps(payload).encode("utf-8")\n\n    def getheader(self, name, default=None):\n        return self.headers.get(name, default)\n\n    def getheaders(self):\n        return self.headers\n\n\ndef _mock_call_api(method, url, header_params=None, body=None, post_params=None, _request_timeout=None):\n    if url.endswith("/api/documents"):\n        payload = {\n            "documents": [\n                {\n                    "id": "doc-1",\n                    "title": "Lease Agreement",\n                    "status": "signed",\n                    "updated_at": "2024-06-12T09:00:00.000Z",\n                    "tenant_id": "tenant-1",\n                },\n                {\n                    "id": "doc-2",\n                    "title": "Move-in Checklist",\n                    "status": "pending_signature",\n                    "updated_at": "2024-06-18T17:30:00.000Z",\n                    "tenant_id": "tenant-2",\n                },\n            ],\n            "meta": {\n                "count": 2,\n                "latestUpdatedAt": "2024-06-18T17:30:00.000Z",\n                "revision": "current",\n            },\n        }\n    elif url.endswith("/api/stripe/checkout"):\n        payload = {"id": "cs_mock_123", "url": f"{BASE_URL}/checkout/cs_mock_123"}\n    else:\n        raise RuntimeError(f"Unexpected URL: {url}")\n    return RESTResponse(_MockResponse(payload))\n\nconfig = Configuration(host=BASE_URL)\nwith ApiClient(config) as api_client:\n    api = DefaultApi(api_client)\n    api.api_client.call_api = _mock_call_api\n    docs = api.list_documents()\n    checkout = api.create_checkout_session(CheckoutSessionRequest(price_id="price_py_456", quantity=1))\n    print(json.dumps({\n        "documents": len(docs.documents),\n        "first": docs.documents[0].id if docs.documents else None,\n        "checkoutUrl": checkout.url,\n    }))\n`

    const result = spawnSync("python", ["-c", script], {
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        SDK_BASE_URL: "http://127.0.0.1/mock",
        PYTHONPATH: pythonPath,
      },
    })

    if (result.error) {
      throw new Error(
        `${result.error.message}\nstdout:${result.stdout}\nstderr:${result.stderr}`
      )
    }

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "Python SDK smoke test failed")
    }

    const output = result.stdout.trim()
    expect(output).toBeTruthy()

    const payload = JSON.parse(output)
    expect(payload.documents).toBe(2)
    expect(payload.first).toBe("doc-1")
    expect(payload.checkoutUrl).toContain("/checkout/cs_mock_123")
  })
})
