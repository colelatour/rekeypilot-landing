const { test, expect } = require("@playwright/test");

test("sign in, finish Harborview, and see it under completed", async ({ page }) => {
  await page.goto("/app/index.html");
  await page.waitForURL(/rekeypilot\/app\/index\.html/);

  await page.locator("#email").fill("sam@northline.example");
  await page.locator("#signin").getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/home\.html/);

  await expect(page.locator("#welcome")).toHaveText("Welcome, Sam");
  await expect(page.locator("#welcome-count")).toHaveText("You have 4 orders to review");
  await expect(page.locator("#list a.po")).toHaveCount(4);

  await page.locator("#list a.po", { hasText: "Harborview" }).click();
  await page.waitForURL(/review\.html\?id=harborview/);
  await expect(page.locator("#title")).toHaveText("Review Harborview");
  await page.locator("#review-form").getByRole("button", { name: "Continue" }).click();

  await page.waitForURL(/preview\.html\?id=harborview$/);
  await expect(page.locator("#title")).toHaveText("Nothing was sent.");
  await page.locator("#actions").getByRole("link", { name: "Continue" }).click();

  await page.waitForURL(/sent=1/);
  await expect(page.locator("#title")).toHaveText("Invoice sent and shipping information updated.");
  await page.getByRole("link", { name: "Back to home" }).click();
  await page.waitForURL(/home\.html/);

  await expect(page.locator("#done-wrap")).toBeVisible();
  await expect(page.locator("#done-list")).toContainText("Harborview");
  await expect(page.locator("#welcome-count")).toHaveText("You have 3 orders to review");
  await expect(page.locator("#list a.po")).toHaveCount(3);

  await page.locator("#signout").click();
  await page.waitForURL(/rekeypilot\/app\/index\.html/);
  await expect(page.locator("#signin")).toBeVisible();
});
