import type { Page } from "@playwright/test";

const E2E_FLAG = "e2e-regression";

export interface RegressionSeed {
  npcId: string;
  sceneId: string;
  tokenId: string;
  pilotId?: string;
  mechId?: string;
}

/** Remove prior E2E artifacts and create a minimal NPC + scene + token for combat UI tests. */
export async function seedRegressionWorld(page: Page): Promise<RegressionSeed> {
  return page.evaluate(async flag => {
    for (const actor of game.actors.filter(a => a.getFlag("lancer", "e2e"))) {
      await actor.delete();
    }
    for (const scene of game.scenes.filter(s => s.getFlag("lancer", "e2e"))) {
      await scene.delete();
    }

    const npc = await Actor.create(
      {
        name: "E2E Test NPC",
        type: "npc",
        img: `systems/${game.system.id}/assets/icons/npc.svg`,
        flags: { lancer: { e2e: flag } },
        system: {
          name: "E2E Test NPC",
          tier: 1,
        },
        items: [
          {
            name: "E2E Test Weapon",
            type: "npc_feature",
            img: `systems/${game.system.id}/assets/icons/generic_item.svg`,
            system: {
              type: "Weapon",
              weapon_type: "Rifle",
              damage: [{ type: "Kinetic", val: "1d6" }],
              range: [
                { type: "Range", val: 5 },
                { type: "Blast", val: 1 },
              ],
            },
          },
        ],
      },
      { renderSheet: false }
    );

    let scene = game.scenes.find(s => s.name === "E2E Regression Scene");
    if (!scene) {
      scene = await Scene.create({
        name: "E2E Regression Scene",
        navigation: true,
        flags: { lancer: { e2e: flag } },
        width: 4000,
        height: 3000,
        grid: { size: 100 },
      });
    }
    await scene.activate();

    const existing = scene.tokens.find(t => t.actorId === npc.id);
    if (!existing) {
      await scene.createEmbeddedDocuments("Token", [
        {
          name: npc.name,
          actorId: npc.id,
          x: 1500,
          y: 1500,
          width: 1,
          height: 1,
        },
      ]);
    }

    const tokenDoc = scene.tokens.find(t => t.actorId === npc.id);
    if (!tokenDoc) throw new Error("Failed to create E2E token");

    let pilot = game.actors.find(a => a.getFlag("lancer", "e2ePilot"));
    if (!pilot) {
      pilot = await Actor.create(
        {
          name: "E2E Test Pilot",
          type: "pilot",
          img: `systems/${game.system.id}/assets/icons/pilot.svg`,
          flags: { lancer: { e2e: flag, e2ePilot: true } },
          system: {
            callsign: "E2E",
            cloud_id: "",
            last_cloud_update: "never",
            loadout: { armor: [null], weapons: [null, null], gear: [null] },
          },
        },
        { renderSheet: false }
      );
    }

    let mech = game.actors.find(a => a.getFlag("lancer", "e2eMech"));
    if (!mech) {
      mech = await Actor.create(
        {
          name: "E2E Test Mech",
          type: "mech",
          img: `systems/${game.system.id}/assets/icons/mech.svg`,
          flags: { lancer: { e2e: flag, e2eMech: true } },
          system: {
            hp: { value: 10, max: 10 },
            heat: { value: 0, max: 4 },
            loadout: {
              weapon_mounts: [
                {
                  type: "Main",
                  bracing: false,
                  slots: [{ size: "Main", weapon: null, mod: null }],
                },
              ],
              systems: [],
              sp: { value: 0, max: 4 },
            },
          },
        },
        { renderSheet: false }
      );
    }

    return { npcId: npc.id!, sceneId: scene.id!, tokenId: tokenDoc.id!, pilotId: pilot.id!, mechId: mech.id! };
  }, E2E_FLAG);
}

/** Poll inside the browser until a selector matches or timeout elapses. */
export async function waitForSheetSelector(
  page: Page,
  actorId: string,
  selector: string,
  timeoutMs = 15_000
): Promise<boolean> {
  return page.evaluate(
    async ({ id, sel, timeout }) => {
      const actor = game.actors.get(id);
      if (!actor?.sheet) return false;
      const root = actor.sheet.element as HTMLElement | undefined;
      if (!root) return false;
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (root.querySelector(sel)) return true;
        await new Promise(r => setTimeout(r, 100));
      }
      return !!root.querySelector(sel);
    },
    { id: actorId, sel: selector, timeout: timeoutMs }
  );
}

/** Open an actor sheet by id and wait for the Lancer sheet root. */
export async function openActorSheet(page: Page, actorId: string): Promise<void> {
  const windowId = await page.evaluate(async id => {
    const actor = game.actors.get(id);
    if (!actor) throw new Error(`Actor ${id} not found`);
    await actor.sheet?.render(true);
    return actor.sheet?.id ?? actor.sheet?.appId ?? null;
  }, actorId);
  if (windowId) {
    await page.locator(`#${windowId}`).waitFor({ state: "visible", timeout: 30_000 });
    return;
  }
  await page.locator(".window-app.lancer.sheet.actor").last().waitFor({ state: "visible", timeout: 30_000 });
}
