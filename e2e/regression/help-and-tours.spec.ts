import { expect, test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";
import { seedRegressionWorld, waitForSheetSelector } from "../helpers/seed";

test.describe("Help and tours @regression", () => {
  test.beforeEach(async ({ page }) => {
    await joinLancerWorld(page);
  });

  test("registers UX tours including attack-dialog", async ({ page }) => {
    const tours = await page.evaluate(() => {
      const keys = ["lcp", "pilot-import", "npc", "combat", "attack-dialog"];
      return keys.map(k => ({ key: k, registered: !!game.tours.get(`lancer.${k}`) }));
    });
    for (const tour of tours) {
      expect(tour.registered, `tour lancer.${tour.key} should be registered`).toBe(true);
    }
  });

  test("help template includes what's new section", async ({ page }) => {
    const html = await page.evaluate(async () => {
      return foundry.applications.handlebars.renderTemplate(`systems/lancer/templates/window/lancerHelp.hbs`, {
        releases: [{ version: "2.20.0", date: "2026-06-06", sections: [{ title: "Added", items: ["E2E item"] }] }],
        wiki: {
          faq: "https://github.com/VacantFanatic/foundryvtt-lancer/wiki/FAQ",
          resources: "https://github.com/VacantFanatic/foundryvtt-lancer/wiki/Recommended-Modules",
          changelog: "https://github.com/VacantFanatic/foundryvtt-lancer/blob/master/CHANGELOG.md",
        },
        focusTopic: null,
      });
    });
    expect(html).toContain("lancer-help-whats-new");
    expect(html).toContain("2.20.0");
  });

  test("pilot cloud tab shows contextual help and Svelte wizard", async ({ page }) => {
    const { pilotId } = await seedRegressionWorld(page);
    await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor) throw new Error("pilot missing");
      await actor.sheet.render(true);
      actor.sheet.changeTab("cloud", "primary", { force: true });
    }, pilotId);

    expect(await waitForSheetSelector(page, pilotId, '[data-help-topic="cloud-import"]')).toBe(true);
    expect(await waitForSheetSelector(page, pilotId, "[data-pilot-cloud-mount] .cloud-wizard-steps")).toBe(true);
    expect(await waitForSheetSelector(page, pilotId, "[data-pilot-cloud-mount] .cloud-download-button")).toBe(true);
  });

  test("automation settings shows contextual help banner", async ({ page }) => {
    await page.evaluate(async () => {
      const menu = game.settings.menus.get("lancer.automationOptions");
      if (!menu?.type) throw new Error("automation menu missing");
      await new menu.type().render(true);
    });
    await expect(page.locator("#lancer-automation-settings aside.lancer-contextual-help")).toBeVisible({
      timeout: 15_000,
    });
    await page.keyboard.press("Escape");
  });
});
