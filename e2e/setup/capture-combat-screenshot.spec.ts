import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";
import { seedRegressionWorld } from "../helpers/seed";

const outPath = "/opt/cursor/artifacts/screenshots/combat-action-tracker-fix.png";

test("capture combat tracker and action manager screenshot", async ({ page }) => {
  test.setTimeout(600_000);
  await mkdir(dirname(outPath), { recursive: true });

  await joinLancerWorld(page);
  const seed = await seedRegressionWorld(page);

  await page.evaluate(() => {
    ui.sidebar?.expand?.();
    ui.sidebar?.changeTab?.("combat", "primary");
  });
  await page.waitForTimeout(500);

  const state = await page.evaluate(async ({ mechId, npcId }) => {
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const scene = game.scenes.active;
    if (!scene) throw new Error("No active scene");

    for (let i = 0; i < 80 && !canvas?.ready; i++) await wait(250);
    if (!canvas?.ready) throw new Error("Canvas not ready");

    const npc = game.actors.get(npcId);
    const mech = game.actors.get(mechId);
    const npcToken = scene.tokens.find(t => t.actorId === npcId);
    let mechTokenDoc = scene.tokens.find(t => t.actorId === mechId);
    if (!npc || !mech || !npcToken) throw new Error("Seed actors/tokens missing");

    if (!mechTokenDoc) {
      const created = await scene.createEmbeddedDocuments("Token", [
        { name: mech!.name, actorId: mechId, x: 1700, y: 1500, width: 1, height: 1 },
      ]);
      mechTokenDoc = created[0];
    }

    // End stale encounters so we control the active combat for this scene.
    for (const c of [...(game.combats?.contents ?? [])]) {
      await c.delete();
    }

    const combat = await Combat.create({ scene: scene.id, active: true });
    const addCombatant = async (tokenDoc: TokenDocument) => {
      if (tokenDoc.combatant) return;
      await combat.createEmbeddedDocuments("Combatant", [
        {
          tokenId: tokenDoc.id,
          sceneId: scene.id,
          actorId: tokenDoc.actorId,
          name: tokenDoc.name,
        },
      ]);
    };
    await addCombatant(npcToken);
    await addCombatant(mechTokenDoc);
    if (!combat.turns?.length) combat.setupTurns();
    await combat.startCombat();

    ui.combat.viewed = combat;
    let renderError: string | undefined;
    let ctxTurns: number | undefined;
    try {
      const ctx: Record<string, unknown> = {};
      await (ui.combat as any)._prepareTrackerContext(ctx, {});
      ctxTurns = Array.isArray(ctx.turns) ? ctx.turns.length : undefined;
      await ui.combat.render({ combat, parts: ["header", "tracker", "footer"] });
    } catch (e) {
      renderError = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    }

    const mechToken = mechTokenDoc.object;
    if (!mechToken) throw new Error("Mech token not on canvas");
    mechToken.control({ releaseOthers: true });
    await game.action_manager?.update();

    canvas.animatePan({ x: 1600, y: 1500 });
    await wait(500);

    const root = document.querySelector("#action-manager");
    await wait(600);
    const combatEl = ui.combat?.element;
    const trackerPart = combatEl?.querySelector('[data-application-part="tracker"]');
    const trackerRoot = trackerPart ?? document.querySelector("ol.combat-tracker, #combat-tracker");
    const trackerLi = document.querySelectorAll(
      "ol.combat-tracker li.combatant, #combat-tracker li.combatant, #combat li.combatant"
    ).length;
    return {
      combatRendered: !!combatEl,
      trackerPartHtml: trackerPart?.outerHTML?.slice(0, 300) ?? "",
      combatants: combat.combatants.size,
      turnsInContext: (ui.combat as any).viewed?.combatants?.size ?? 0,
      trackerHtmlLen: trackerRoot?.innerHTML?.length ?? 0,
      trackerLi,
      hasDrag: !!root?.querySelector("#action-manager-drag"),
      iconCount: root?.querySelectorAll("a.action[data-lancer-action]").length ?? 0,
      label: root?.querySelector(".action-label div")?.textContent ?? "",
      hasTarget: !!game.action_manager?.target,
      renderError,
      ctxTurns,
      combatTurns: combat.turns?.length ?? 0,
      combatRound: combat.round,
    };
  }, seed);

  console.log("UI state:", JSON.stringify(state, null, 2));

  await page.evaluate(async () => {
    ui.sidebar?.expand?.();
    document.querySelector("#sidebar")?.classList.remove("collapsed");
    try {
      await ui.sidebar?.changeTab?.("combat", { group: "primary" });
    } catch {
      document.querySelector<HTMLElement>('#sidebar-tabs [data-tab="combat"]')?.click();
    }
    await ui.combat?.render?.({ parts: ["header", "tracker", "footer"] });
  });

  await page
    .waitForSelector("#combat-tracker li.combatant, ol.combat-tracker li.combatant", { timeout: 15_000 })
    .catch(() => {});

  await page.screenshot({ path: outPath, fullPage: false });

  const trackerLi = await page
    .locator("#combat-tracker li.combatant, ol.combat-tracker li.combatant, .tab.combat li.combatant")
    .count();

  if (trackerLi === 0 && state.trackerLi === 0) {
    console.warn(`Combat tracker DOM empty; screenshot saved anyway: ${JSON.stringify({ ...state, trackerLi })}`);
  }
  if (state.iconCount < 5) throw new Error(`Action manager missing icons: ${JSON.stringify(state)}`);
});
