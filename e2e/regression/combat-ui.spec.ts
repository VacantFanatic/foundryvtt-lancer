import { expect, test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";
import { seedRegressionWorld } from "../helpers/seed";

async function waitForCanvasReady(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(() => canvas?.ready === true, undefined, { timeout: 60_000 });
}

test.describe("Combat UI @regression", () => {
  test.beforeEach(async ({ page }) => {
    await joinLancerWorld(page);
    await seedRegressionWorld(page);
    await waitForCanvasReady(page);
  });

  test("combat tracker lists combatants after adding a token", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const scene = game.scenes.active;
      const tokenDoc = scene?.tokens.contents[0];
      if (!tokenDoc) throw new Error("No seed token");

      let combat = game.combats?.find(c => c.scene?.id === scene.id);
      if (!combat) combat = await Combat.create({ scene: scene.id });

      if (!tokenDoc.combatant) await tokenDoc.toggleCombatant(true);

      ui.combat.viewed = combat;
      await ui.combat.render();

      const selectors = [
        "#combat-tracker li.combatant",
        "ol.combat-tracker li.combatant",
        ".combat-tracker li.combatant",
        "#combat li.combatant",
      ];
      const counts = Object.fromEntries(selectors.map(sel => [sel, document.querySelectorAll(sel).length]));
      return {
        combatants: combat.combatants.size,
        turnCount: ui.combat.viewed?.combatants?.size ?? 0,
        counts,
        trackerHtml:
          document.querySelector("#combat-tracker, ol.combat-tracker, #combat")?.outerHTML?.slice(0, 800) ?? "",
      };
    });

    expect(result.combatants).toBeGreaterThan(0);
    const listed = Math.max(...Object.values(result.counts));
    expect(listed, `tracker DOM counts: ${JSON.stringify(result.counts)} html: ${result.trackerHtml}`).toBeGreaterThan(
      0
    );
  });

  test("action manager shows drag handle and action icons for in-combat token", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const npc = game.actors.find(a => a.name === "E2E Test NPC");
      const scene = game.scenes.active;
      const tokenDoc = scene?.tokens.find(t => t.actorId === npc?.id);
      if (!npc || !tokenDoc) throw new Error("Seed NPC token missing");

      let combat = game.combats?.find(c => c.scene?.id === scene!.id);
      if (!combat) combat = await Combat.create({ scene: scene!.id });
      if (!tokenDoc.combatant) await tokenDoc.toggleCombatant(true);

      const token = tokenDoc.object;
      if (!token) throw new Error("Token placeable missing");
      if (!canvas.ready) throw new Error("Canvas not ready");
      token.control({ releaseOthers: true });

      if (!game.action_manager) throw new Error("action_manager not initialized");
      if (!game.action_manager.enabled) throw new Error("action_manager not enabled");
      await game.action_manager.update();

      const root = document.querySelector("#action-manager");
      return {
        hasRoot: !!root,
        hasDrag: !!root?.querySelector("#action-manager-drag"),
        iconCount: root?.querySelectorAll("a.action[data-lancer-action]").length ?? 0,
        label: root?.querySelector(".action-label div")?.textContent ?? "",
        html: root?.innerHTML?.slice(0, 400) ?? "",
        enabled: game.action_manager.enabled,
        hasTarget: !!game.action_manager.target,
      };
    });

    expect(result.hasRoot).toBe(true);
    expect(result.hasDrag).toBe(true);
    expect(result.hasTarget).toBe(true);
    expect(result.iconCount).toBeGreaterThanOrEqual(5);
    expect(result.label.length).toBeGreaterThan(0);
  });

  test("action manager shows icons for in-combat mech token", async ({ page }) => {
    const seed = await seedRegressionWorld(page);
    const result = await page.evaluate(async ({ mechId }) => {
      const mech = game.actors.get(mechId);
      const scene = game.scenes.active;
      if (!mech || !scene) throw new Error("Mech or scene missing");

      let tokenDoc = scene.tokens.find(t => t.actorId === mechId);
      if (!tokenDoc) {
        const created = await scene.createEmbeddedDocuments("Token", [
          {
            name: mech.name,
            actorId: mechId,
            x: 1600,
            y: 1500,
            width: 1,
            height: 1,
          },
        ]);
        tokenDoc = created[0];
      }

      let combat = game.combats?.find(c => c.scene?.id === scene.id);
      if (!combat) combat = await Combat.create({ scene: scene.id });
      if (!tokenDoc.combatant) await tokenDoc.toggleCombatant(true);

      const token = tokenDoc.object;
      if (!token) throw new Error("Mech token placeable missing");
      token.control({ releaseOthers: true });

      await game.action_manager?.update();

      const root = document.querySelector("#action-manager");
      return {
        hasTarget: !!game.action_manager?.target,
        iconCount: root?.querySelectorAll("a.action[data-lancer-action]").length ?? 0,
        label: root?.querySelector(".action-label div")?.textContent ?? "",
      };
    }, seed);

    expect(result.hasTarget).toBe(true);
    expect(result.iconCount).toBeGreaterThanOrEqual(5);
    expect(result.label).toContain("MECH");
  });
});
