import { expect, test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";
import { seedRegressionWorld, waitForSheetSelector } from "../helpers/seed";

test.describe("Sprint G features @regression", () => {
  test.beforeEach(async ({ page }) => {
    await joinLancerWorld(page);
  });

  test("chat attack card uses SCSS class instead of inline margin", async ({ page }) => {
    const markup = await page.evaluate(async () => {
      return foundry.applications.handlebars.renderTemplate("systems/lancer/templates/chat/attack-card.hbs", {
        title: "Test",
      });
    });
    expect(markup).toContain("lancer-chat-card");
    expect(markup).not.toContain('style="margin: 0px"');
  });

  test("legacy LCP manager template is not preloaded", async ({ page }) => {
    const preloaded = await page.evaluate(() => {
      const key = "systems/lancer/templates/lcp/lcp-manager.hbs";
      const partials = (foundry.applications.handlebars as { partials?: Record<string, unknown> }).partials;
      return !!partials?.[key];
    });
    expect(preloaded).toBe(false);
  });

  test("LCP manager renders Svelte mount when opened", async ({ page }) => {
    await page.locator('nav#sidebar-tabs button[data-tab="compendium"]').click();
    const lcpButton = page.locator("#lcp-manager-button");
    await expect(lcpButton).toBeVisible({ timeout: 15_000 });
    await lcpButton.click();
    await expect(page.locator(".lcp-manager .svelte-app-mount")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Escape");
  });

  test("mech loadout shows hybrid overview and legacy editor controls", async ({ page }) => {
    const { mechId } = await seedRegressionWorld(page);
    await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor) throw new Error("mech missing");
      await actor.sheet.render(true);
      actor.sheet.changeTab("gear", "primary", { force: true });
    }, mechId);

    expect(await waitForSheetSelector(page, mechId, "[data-loadout-editor-mount] .loadout-editor")).toBe(true);

    const controls = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor) throw new Error("mech missing");
      actor.sheet.changeTab("gear", "primary", { force: true });
      actor.sheet.element?.querySelector('.tab.gear[data-tab="gear"]')?.setAttribute("data-gear-mode", "edit");
      await actor.sheet.render(false);
      const root = actor.sheet.element as HTMLElement;
      return {
        all: !!root.querySelector(".reset-all-weapon-mounts-button"),
        mount: !!root.querySelector(".reset-weapon-mount-button"),
        sys: !!root.querySelector(".reset-system-mount-button"),
      };
    }, mechId);
    expect(controls.all).toBe(true);
    expect(controls.mount).toBe(true);
    expect(controls.sys).toBe(true);
  });

  test("combat tracker template includes target toggle control", async ({ page }) => {
    const html = await page.evaluate(async () => {
      return foundry.applications.handlebars.renderTemplate("systems/lancer/templates/combat/tracker.hbs", {
        turns: [
          {
            id: "c1",
            css: "",
            img: "",
            name: "E2E NPC",
            hidden: false,
            isDefeated: false,
            canPing: false,
            resource: "",
            targetSummary: "",
            isTargeted: false,
            canTarget: true,
            buttons: [],
            activations: 1,
            effects: { tooltip: "", icons: [] },
          },
        ],
      });
    });
    expect(html).toContain('data-action="toggleCombatantTarget"');
  });
});
