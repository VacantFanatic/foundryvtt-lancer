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
      actor.sheet.changeTab("gear", "primary", { force: true });
      const root = actor.sheet.element as HTMLElement;
      const gearTab = root.querySelector('.tab.gear[data-tab="gear"]');
      const loadoutTab = root.querySelector('.tab.gear[data-tab="gear"] .gear-edit-panel');
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
      actor.sheet.changeTab("abilities", "primary", { force: true });
      const root = actor.sheet.element as HTMLElement;
      return !!root.querySelector(".mech-combat-dock");
    }, mechId);
    expect(dockOnTalentsTab).toBe(true);
  });

  test("combat tab orders gear before stats and omits redundant systems panel", async ({ page }) => {
    const { mechId } = await seedRegressionWorld(page);
    await openActorSheet(page, mechId);

    const layout = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor?.sheet) return null;
      actor.sheet.changeTab("combat", "primary", { force: true });
      const tab = actor.sheet.element?.querySelector('.tab.combat[data-tab="combat"]') as HTMLElement | null;
      if (!tab) return null;
      const sections = [...tab.querySelectorAll("[data-mech-section]")].map(el =>
        el.getAttribute("data-mech-section")
      );
      const weaponsIndex = sections.indexOf("combat-weapons");
      const combatIndex = sections.indexOf("combat");
      return {
        hasSystemsPanel: !!tab.querySelector('[data-mech-section="systems"]'),
        gearBeforeCombat: weaponsIndex >= 0 && combatIndex > weaponsIndex,
        sections,
      };
    }, mechId);

    expect(layout?.hasSystemsPanel).toBe(false);
    expect(layout?.gearBeforeCombat).toBe(true);
    expect(layout?.sections?.at(-1)).toBe("combat");
  });

  test("combat gear cards and collapsed macros on stats tab", async ({ page }) => {
    const { mechId } = await seedRegressionWorld(page);
    await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor) throw new Error("mech missing");
      const weapon = await Item.create(
        {
          name: "E2E Test Rifle",
          type: "mech_weapon",
          img: `systems/${game.system.id}/assets/icons/mech_weapon.svg`,
          system: {
            size: "Main",
            sp: 0,
            profiles: [
              {
                name: "Standard",
                type: "Rifle",
                range: [{ type: "Range", val: 10 }],
                damage: [{ type: "Kinetic", val: "1d6" }],
                actions: [],
                tags: [],
                effect: "",
                on_attack: "",
                on_hit: "",
                on_crit: "",
              },
            ],
            selected_profile_index: 0,
            tags: [],
            actions: [],
          },
        },
        { parent: actor }
      );
      const mounts = foundry.utils.deepClone(actor.system.loadout.weapon_mounts);
      mounts[0].slots[0].weapon = weapon.id;
      await actor.update({ "system.loadout.weapon_mounts": mounts });
      await actor.sheet.render(true);
      actor.sheet.changeTab("combat", "primary", { force: true });
    }, mechId);

    const result = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor?.sheet) return null;
      const root = actor.sheet.element as HTMLElement;
      const statsTab = root.querySelector('.tab.combat[data-tab="combat"]');
      return {
        hasWeaponCard: !!statsTab?.querySelector(".mech-combat-gear-card .roll-attack"),
        macrosCollapsed: !!statsTab?.querySelector('[data-collapse-id="mech-stats-macros"].collapsed'),
      };
    }, mechId);

    expect(result?.hasWeaponCard).toBe(true);
    expect(result?.macrosCollapsed).toBe(true);
  });

  test("gear tab defaults to play view and can switch to edit loadout", async ({ page }) => {
    const { mechId } = await seedRegressionWorld(page);
    await openActorSheet(page, mechId);

    const initial = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor?.sheet) return null;
      actor.sheet.changeTab("gear", "primary", { force: true });
      const gearTab = actor.sheet.element?.querySelector('.tab.gear[data-tab="gear"]') as HTMLElement | null;
      return {
        mode: gearTab?.getAttribute("data-gear-mode"),
        playVisible: gearTab?.querySelector(".gear-play-panel")?.checkVisibility?.() ?? true,
        editHidden: gearTab?.querySelector(".gear-edit-panel")?.checkVisibility?.() === false,
      };
    }, mechId);

    expect(initial?.mode).toBe("play");

    await page.evaluate(async id => {
      const actor = game.actors.get(id);
      const gearTab = actor?.sheet?.element?.querySelector('.tab.gear[data-tab="gear"]');
      gearTab?.querySelector<HTMLButtonElement>('.gear-mode-button[data-gear-mode="edit"]')?.click();
    }, mechId);

    const edited = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      const gearTab = actor?.sheet?.element?.querySelector('.tab.gear[data-tab="gear"]') as HTMLElement | null;
      return gearTab?.getAttribute("data-gear-mode");
    }, mechId);

    expect(edited).toBe("edit");
  });

  test("abilities tab shows empty state without pilot and effects tab shows count badge", async ({ page }) => {
    const { mechId } = await seedRegressionWorld(page);
    await openActorSheet(page, mechId);

    const emptyState = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor?.sheet) return false;
      actor.sheet.changeTab("abilities", "primary", { force: true });
      const root = actor.sheet.element as HTMLElement;
      return !!root.querySelector(".mech-abilities-empty");
    }, mechId);
    expect(emptyState).toBe(true);

    const effectsLabel = await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor?.sheet) return "";
      const nav = actor.sheet.element?.querySelector('a[data-tab="effects"]');
      return nav?.textContent?.trim() ?? "";
    }, mechId);
    expect(effectsLabel).toContain("<EFFECTS//ACTIVE>");
  });
});
