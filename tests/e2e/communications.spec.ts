import { expect, test, type Page } from "@playwright/test"

const communicationsPath = "/playground/communications"

const selectRole = async (page: Page, role: string) => {
  await page.selectOption('[data-testid="role-selector"]', role)
}

test.describe("Resident communications hub", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(communicationsPath)
  })

  test("resident can publish a bulletin post and comment", async ({ page }) => {
    await selectRole(page, "resident")

    const title = `Pool Party ${Date.now()}`
    const message = "Join us for a community pool party this weekend!"

    await page.fill('[data-testid="post-title"]', title)
    await page.fill('[data-testid="post-message"]', message)
    await page.click('[data-testid="submit-post"]')

    const firstPost = page
      .locator('[data-testid="published-posts"]')
      .locator('[data-testid="post-card"]').first()

    await expect(firstPost).toContainText(title)
    await expect(firstPost).toContainText(message)

    const commentMessage = "Looking forward to it!"

    await firstPost.locator('[data-testid="comment-input"]').fill(commentMessage)
    await firstPost.locator('[data-testid="comment-submit"]').click()

    await expect(firstPost.locator('[data-testid="post-comments"]')).toContainText(
      commentMessage
    )
  })

  test("moderator can approve filtered submissions", async ({ page }) => {
    await selectRole(page, "resident")

    const flaggedTitle = `Flagged update ${Date.now()}`
    const flaggedMessage = "This message contains spam and should be held." // includes banned word

    await page.fill('[data-testid="post-title"]', flaggedTitle)
    await page.fill('[data-testid="post-message"]', flaggedMessage)
    await page.click('[data-testid="submit-post"]')

    const queueItem = page
      .locator('[data-testid="moderation-queue"]')
      .locator('[data-testid="moderation-item"]', { hasText: flaggedTitle })

    await expect(queueItem).toContainText("Awaiting review")

    await selectRole(page, "moderator")
    await queueItem.locator('[data-testid="approve-action"]').click()

    const publishedPosts = page
      .locator('[data-testid="published-posts"]')
      .locator('[data-testid="post-card"]').first()

    await expect(publishedPosts).toContainText(flaggedTitle)
    await expect(page.locator('[data-testid="moderation-log"]')).toContainText(
      "approved"
    )
  })
})
