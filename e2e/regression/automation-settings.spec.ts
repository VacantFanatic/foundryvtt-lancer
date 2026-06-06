import { expect, test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";

test.describe("Automation settings @regression", () => {
  test.beforeEach(async ({ page }) => {
    await joinLancerWorld(page);
  });

  test("prompt damage after attack setting exists and toggles", async ({ page }) => {
    const initial = await page.evaluate(() => {
      const opts = game.settings.get("lancer", "automationOptions");
      return opts.prompt_damage_after_attack;
    });
    expect(typeof initial).toBe("boolean");

    await page.evaluate(async () => {
      const current = game.settings.get("lancer", "automationOptions");
      const next = current.toObject();
      next.prompt_damage_after_attack = !next.prompt_damage_after_attack;
      await game.settings.set("lancer", "automationOptions", next);
    });

    const toggled = await page.evaluate(() => {
      return game.settings.get("lancer", "automationOptions").prompt_damage_after_attack;
    });
    expect(toggled).toBe(!initial);

    await page.evaluate(async initialValue => {
      const current = game.settings.get("lancer", "automationOptions");
      const next = current.toObject();
      next.prompt_damage_after_attack = initialValue;
      await game.settings.set("lancer", "automationOptions", next);
    }, initial);
  });

  test("automation options object includes prompt damage field", async ({ page }) => {
    const hasField = await page.evaluate(() => {
      return "prompt_damage_after_attack" in game.settings.get("lancer", "automationOptions").toObject();
    });
    expect(hasField).toBe(true);
  });
});
