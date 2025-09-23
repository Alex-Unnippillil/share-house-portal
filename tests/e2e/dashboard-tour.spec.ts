import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
                window.__tourCallLog = [];
                window.__dashboardTourOverrides = {
                        getStatus: async () => {
                                window.__tourCallLog?.push?.("status");
                                return { hasSeenTour: false };
                        },
                        markComplete: async () => {
                                window.__tourCallLog?.push?.("complete");
                                return { hasSeenTour: true };
                        },
                        replay: async () => {
                                window.__tourCallLog?.push?.("replay");
                                return { hasSeenTour: false };
                        },
                };
        });
});

test("allows residents to skip the dashboard tour", async ({ page }) => {
        await page.goto("/tour-preview");

        const dialog = page.getByTestId("dashboard-first-run-tour");
        await expect(dialog).toBeVisible();

        await page.getByRole("button", { name: /Skip tour/i }).click();

        await expect(dialog).toHaveCount(0);

        const callLog = await page.evaluate(() => window.__tourCallLog ?? []);
        expect(callLog).toContain("complete");
});

test("walks through the entire tour flow", async ({ page }) => {
        await page.goto("/tour-preview");

        const dialog = page.getByTestId("dashboard-first-run-tour");
        await expect(dialog).toBeVisible();

        const stepTitles = [
                "Household navigation",
                "Mobile quick menu",
                "Workspace canvas",
                "Help & resources",
        ];

        for (let index = 0; index < stepTitles.length; index += 1) {
                await expect(page.getByText(stepTitles[index], { exact: false })).toBeVisible();
                const isLastStep = index === stepTitles.length - 1;
                const actionLabel = isLastStep ? /Finish/i : /Next/i;
                await page.getByRole("button", { name: actionLabel }).click();
        }

        await expect(dialog).toHaveCount(0);

        const callLog = await page.evaluate(() => window.__tourCallLog ?? []);
        const completeCount = callLog.filter((entry: string) => entry === "complete").length;
        expect(completeCount).toBeGreaterThan(0);
});

test("relaunches the tour from the help entry", async ({ page }) => {
        await page.goto("/tour-preview");

        const dialog = page.getByTestId("dashboard-first-run-tour");
        await expect(dialog).toBeVisible();

        await page.getByRole("button", { name: /Skip tour/i }).click();
        await expect(dialog).toHaveCount(0);

        await page.getByRole("button", { name: /Product tour/i }).click();
        await expect(dialog).toBeVisible();

        const callLog = await page.evaluate(() => window.__tourCallLog ?? []);
        expect(callLog).toContain("replay");
});
