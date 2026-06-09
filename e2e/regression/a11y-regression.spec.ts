import { expect, test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";
import { seedRegressionWorld } from "../helpers/seed";

test.describe("Accessibility regression @regression", () => {
  test.beforeEach(async ({ page }) => {
    await joinLancerWorld(page);
    await seedRegressionWorld(page);
  });

  test("Acc/Diff HUD shows first-open help banner and aria-modal", async ({ page }) => {
    await page.evaluate(async () => {
      await game.settings.set("lancer", "helpSeenAccdiff", false);
    });

    await page.evaluate(() => {
      const npc = game.actors.find(a => a.name === "E2E Test NPC");
      const weapon = npc?.items.find(i => i.name === "E2E Test Weapon");
      if (!weapon) throw new Error("E2E weapon missing");
      void weapon.beginWeaponAttackFlow();
    });

    await expect(page.locator("#hudzone #accdiff")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#hudzone #accdiff [data-help-topic="accdiff"]')).toBeVisible();
    await expect(page.locator("#hudzone #accdiff[aria-modal='true']")).toBeVisible();

    await page.locator('#hudzone #accdiff [data-help-topic="accdiff"] .lancer-contextual-help-dismiss').click();
    await expect(page.locator('#hudzone #accdiff [data-help-topic="accdiff"]')).toBeHidden();

    await page.locator("#hudzone #accdiff .lancer-hud-buttons .cancel").click();
  });

  test("action manager template controls include aria-label", async ({ page }) => {
    const allLabeled = await page.evaluate(async () => {
      const html = await foundry.applications.handlebars.renderTemplate(
        "systems/lancer/templates/window/action_manager.hbs",
        {
          showTextLabels: false,
          clickable: true,
          positionWidth: 300,
          name: "E2E",
          actions: { protocol: true, move: true, full: false, quick: false },
        }
      );
      const div = document.createElement("div");
      div.innerHTML = html;
      const controls = div.querySelectorAll("[data-lancer-action], #action-manager-reset, #action-manager-drag");
      return controls.length >= 3 && Array.from(controls).every(b => b.hasAttribute("aria-label"));
    });
    expect(allLabeled).toBe(true);
  });
});
