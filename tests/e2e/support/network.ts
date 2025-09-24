import type { BrowserContext, Route } from "@playwright/test"

const shouldStubNetwork = process.env.PLAYWRIGHT_DISABLE_NETWORK_STUBS !== "true"

const supabasePatterns = [
  /https?:\/\/[a-z0-9.-]*supabase\.co\/.*/i,
  /https?:\/\/[a-z0-9.-]*supabase\.in\/.*/i,
  /https?:\/\/[a-z0-9.-]*supabase\.net\/.*/i,
  /https?:\/\/(?:localhost|127\.0\.0\.1):54321\/.*/i,
]

const syntheticTenant = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "synthetic.tenant@roomsily.test",
  role: "authenticated",
  aud: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Synthetic Tenant" },
  created_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
}

const syntheticManager = {
  id: "00000000-0000-4000-8000-000000000002",
  email: "manager@roomsily.test",
  full_name: "Casey Property Manager",
  role: "property_manager",
  unit_id: "unit-100",
}

const syntheticProfile = {
  id: syntheticTenant.id,
  email: syntheticTenant.email,
  full_name: "Synthetic Tenant",
  role: "tenant",
  unit_id: "unit-100",
}

function respondJSON(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

export async function installSyntheticNetworkStubs(context: BrowserContext) {
  if (!shouldStubNetwork) {
    return
  }

  for (const pattern of supabasePatterns) {
    await context.route(pattern, async (route) => {
      const request = route.request()
      const url = new URL(request.url())

      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, body: "" })
        return
      }

      if (url.pathname.includes("/auth/v1/user")) {
        await respondJSON(route, { user: syntheticTenant })
        return
      }

      if (url.pathname.includes("/auth/v1/token") || url.pathname.includes("/auth/v1/signup")) {
        await respondJSON(route, { access_token: "stub", token_type: "bearer" })
        return
      }

      if (url.pathname.includes("/rest/v1/rpc/check_amenity_conflicts")) {
        await respondJSON(route, { conflicts: [], has_conflict: false })
        return
      }

      if (url.pathname.includes("/rest/v1/maintenance_requests")) {
        if (request.method() === "POST") {
          const rawPayload = request.postData()
          const payload = rawPayload ? JSON.parse(rawPayload) : {}
          await respondJSON(
            route,
            {
              id: "maintenance-request-stub",
              status: "pending",
              inserted_at: new Date().toISOString(),
              ...payload,
            },
            201,
          )
          return
        }

        await respondJSON(route, [])
        return
      }

      if (url.pathname.includes("/rest/v1/profiles")) {
        const params = url.searchParams
        const idParam = params.get("id")
        const unitParam = params.get("unit_id")
        const acceptHeader = request.headerValue("accept") || ""
        const wantsSingle = acceptHeader.includes("application/vnd.pgrst.object") || params.get("limit") === "1"

        if (idParam && idParam.startsWith("eq.")) {
          const id = idParam.replace("eq.", "")
          if (id === syntheticTenant.id) {
            await respondJSON(route, wantsSingle ? syntheticProfile : [syntheticProfile])
            return
          }
          if (id === syntheticManager.id) {
            await respondJSON(route, wantsSingle ? syntheticManager : [syntheticManager])
            return
          }
        }

        if (unitParam && unitParam.startsWith("eq.")) {
          await respondJSON(route, [syntheticManager])
          return
        }

        await respondJSON(route, wantsSingle ? null : [])
        return
      }

      await respondJSON(route, [])
    })
  }

  await context.route("**/api/stripe/checkout", async (route) => {
    await respondJSON(route, { id: "stub-checkout", url: null })
  })

  await context.route("**/api/stripe/billing-portal", async (route) => {
    await respondJSON(route, { url: null })
  })
}
