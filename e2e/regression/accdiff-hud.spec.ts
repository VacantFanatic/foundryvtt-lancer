import { expect, test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";
import { seedRegressionWorld } from "../helpers/seed";

test.describe("Acc/Diff HUD @regression", () => {
  test.beforeEach(async ({ page }) => {
    await joinLancerWorld(page);
    await seedRegressionWorld(page);
  });

  test("advanced section collapses plugins and template tools by default", async ({ page }) => {
    await page.evaluate(() => {
      const npc = game.actors.find(a => a.name === "E2E Test NPC");
      const weapon = npc?.items.find(i => i.name === "E2E Test Weapon");
      if (!weapon) throw new Error("E2E weapon missing");
      void weapon.beginWeaponAttackFlow();
    });

    await expect(page.locator("#hudzone #accdiff")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#hudzone #accdiff .accdiff-advanced-toggle button")).toBeVisible();

    const advancedVisible = await page.locator("#hudzone #accdiff .accdiff-advanced").isVisible();
    expect(advancedVisible).toBe(false);

    await page.locator("#hudzone #accdiff .accdiff-advanced-toggle button").click();
    await expect(page.locator("#hudzone #accdiff .accdiff-advanced")).toBeVisible();

    await page.locator("#hudzone #accdiff .lancer-hud-buttons .cancel").click();
    await expect(page.locator("#hudzone #accdiff")).toBeHidden({ timeout: 10_000 });
  });

  test("remember advanced setting persists per weapon", async ({ page }) => {
    await page.evaluate(async () => {
      await game.settings.set("lancer", "accdiffRememberAdvanced", true);
      await game.settings.set("lancer", "accdiffAdvancedExpanded", {});
    });

    await page.evaluate(() => {
      const npc = game.actors.find(a => a.name === "E2E Test NPC");
      const weapon = npc?.items.find(i => i.name === "E2E Test Weapon");
      if (!weapon) throw new Error("E2E weapon missing");
      void weapon.beginWeaponAttackFlow();
    });
    await expect(page.locator("#hudzone #accdiff")).toBeVisible({ timeout: 30_000 });

    await page.locator("#hudzone #accdiff .accdiff-advanced-toggle button").click();
    await page.locator("#hudzone #accdiff .lancer-hud-buttons .cancel").click();
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const npc = game.actors.find(a => a.name === "E2E Test NPC");
      const weapon = npc?.items.find(i => i.name === "E2E Test Weapon");
      if (!weapon) throw new Error("E2E weapon missing");
      void weapon.beginWeaponAttackFlow();
    });
    await expect(page.locator("#hudzone #accdiff")).toBeVisible({ timeout: 30_000 });

    await expect(page.locator("#hudzone #accdiff .accdiff-advanced")).toBeVisible();
    await page.locator("#hudzone #accdiff .lancer-hud-buttons .cancel").click();
  });
});
