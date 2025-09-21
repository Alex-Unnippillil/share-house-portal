import { expect, test } from "@playwright/test"

test.describe("authentication journeys", () => {
  test("login page renders form and validation", async ({ page }) => {
    await page.goto("/auth/login")

    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Google" })).toBeVisible()

    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.getByText("Enter a valid email")).toBeVisible()
    await expect(page.getByText("Password is required")).toBeVisible()

    await page.getByRole("link", { name: "Forgot your password?" }).click()
    await expect(page).toHaveURL(/\/auth\/reset-password$/)
  })

  test("SSO callback displays provider errors", async ({ page }) => {
    await page.goto("/auth/sso-callback?error_description=Access%20denied&next=%2Fdashboard")

    await expect(page.getByRole("heading", { name: "Checking your credentials" })).toBeVisible()
    await expect(page.getByText("Access denied")).toBeVisible()
    await expect(page.getByRole("button", { name: "Back to login" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible()
  })

  test("MFA page toggles between email and authenticator guidance", async ({ page }) => {
    await page.goto("/auth/mfa")

    await expect(page.getByRole("heading", { name: "Secure your account" })).toBeVisible()
    await page.getByRole("tab", { name: "Authenticator app" }).click()
    await expect(page.getByText("Install Google Authenticator", { exact: false })).toBeVisible()
    await page.getByRole("tab", { name: "Email code" }).click()
    await expect(page.getByRole("button", { name: "Send code" })).toBeVisible()
  })

  test("session renewal page surfaces refresh action", async ({ page }) => {
    await page.goto("/auth/session-renewal")

    await expect(page.getByRole("heading", { name: "Refresh your session" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Refresh session" })).toBeVisible()
  })

  test("public navigation hides protected links", async ({ page }) => {
    await page.goto("/")

    const header = page.locator("header")
    await expect(header.getByRole("link", { name: "Dashboard" })).toHaveCount(0)
    await expect(header.getByRole("link", { name: "Account" })).toHaveCount(0)
    const loginLink = header.getByRole("link", { name: "Log in" })
    await expect(loginLink).toHaveAttribute("href", "/auth/login")
  })
})
