import { expect, type APIRequestContext, type Page } from "@playwright/test"

export async function expectProtectedRoute(page: Page, path: string, contentPattern: RegExp) {
  await page.goto(path)

  if (page.url().includes("/auth/signin")) {
    await expect(page).toHaveURL(new RegExp(`/auth/signin\\?redirectTo=${encodeURIComponent(path)}`))
    return
  }

  await expect(page.getByText(contentPattern)).toBeVisible()
}

export async function expectAuthBoundary(request: APIRequestContext, endpoint: string) {
  const response = await request.get(endpoint)
  expect([401, 403]).toContain(response.status())
}
