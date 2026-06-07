import { expect, test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";
import { openActorSheet, seedRegressionWorld } from "../helpers/seed";

test.describe("Mech sheet UX @regression", () => {
  test.beforeEach(async ({ page }) => {
    await joinLancerWorld(page);
  });

  test("combat dock is visible on every tab and loadout no longer has attack utilities", async ({ page }) => {
    const { mechId } = await seedRegressionWorld(page);
    await openActorSheet(page, mechId);

    const dockVisible = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor?.sheet) return false;
      const root = actor.sheet.element as HTMLElement;
      return !!root.querySelector(".mech-combat-dock");
    }, mechId);
    expect(dockVisible).toBe(true);

    const loadoutAttackUtilities = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor?.sheet) return { onLoadout: true, onDock: false };
      actor.sheet.changeTab("loadout", "primary", { force: true });
      const root = actor.sheet.element as HTMLElement;
      const loadoutTab = root.querySelector('.tab.loadout[data-tab="loadout"]');
      const dock = root.querySelector(".mech-combat-dock");
      const loadoutButtons = loadoutTab?.querySelectorAll('[data-flow-type="BasicAttack"]') ?? [];
      const dockButtons = dock?.querySelectorAll('[data-flow-type="BasicAttack"]') ?? [];
      return { onLoadout: loadoutButtons.length > 0, onDock: dockButtons.length > 0 };
    }, mechId);

    expect(loadoutAttackUtilities.onDock).toBe(true);
    expect(loadoutAttackUtilities.onLoadout).toBe(false);

    const dockOnTalentsTab = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor?.sheet) return false;
      actor.sheet.changeTab("talents", "primary", { force: true });
      const root = actor.sheet.element as HTMLElement;
      return !!root.querySelector(".mech-combat-dock");
    }, mechId);
    expect(dockOnTalentsTab).toBe(true);
  });
});
