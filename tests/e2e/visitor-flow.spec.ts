import { expect, test } from '@playwright/test'

const arrivalSelector = 'input[name="arrivalDate"]'
const departureSelector = 'input[name="departureDate"]'

test.describe('Visitor request flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-utils/visitors')
  })

  test('allows tenants to submit valid guest requests', async ({ page }) => {
    await page.fill('input[name="visitorName"]', 'Playwright Guest')
    await page.fill('input[name="visitorEmail"]', 'guest@example.com')
    await page.fill(arrivalSelector, '2024-04-10')
    await page.fill(departureSelector, '2024-04-11')
    await page.fill('textarea[name="reason"]', 'Visiting for the weekend.')

    await page.getByRole('button', { name: 'Submit request' }).click()

    await expect(page.getByText('Guest stay submitted for 2 nights.')).toBeVisible()
    await expect(page.locator('input[name="visitorName"]')).toHaveValue('')
  })

  test('blocks requests that exceed the consecutive night policy', async ({ page }) => {
    await page.fill('input[name="visitorName"]', 'Policy Breaker')
    await page.fill(arrivalSelector, '2024-04-10')
    await page.fill(departureSelector, '2024-04-20')
    await page.fill('textarea[name="reason"]', 'Attempting a long stay.')

    await page.getByRole('button', { name: 'Submit request' }).click()

    await expect(
      page.getByText('This stay exceeds the 3-night limit defined by your visitor policy.'),
    ).toBeVisible()
    await expect(
      page.getByText('Visitor stays are limited to 3 consecutive nights.'),
    ).toBeVisible()
  })
})
