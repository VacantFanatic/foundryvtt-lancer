import { expect, test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";
import { seedRegressionWorld } from "../helpers/seed";

test.describe("Loadout editor GA @regression", () => {
  test.beforeEach(async ({ page }) => {
    await joinLancerWorld(page);
  });

  test("experimental loadout editor client setting is removed", async ({ page }) => {
    const registered = await page.evaluate(() => {
      return !!game.settings.settings.get("lancer.experimentalLoadoutEditor");
    });
    expect(registered).toBe(false);
  });

  test("system version is 3.x after GA release", async ({ page }) => {
    const version = await page.evaluate(() => game.system.version);
    expect(version).toMatch(/^3\./);
  });
});
