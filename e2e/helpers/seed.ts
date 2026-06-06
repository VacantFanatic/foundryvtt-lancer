import type { Page } from "@playwright/test";

const E2E_FLAG = "e2e-regression";

/** Remove prior E2E artifacts and create a minimal NPC + scene + token for combat UI tests. */
export async function seedRegressionWorld(page: Page): Promise<{ npcId: string; sceneId: string; tokenId: string }> {
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
    return { npcId: npc.id!, sceneId: scene.id!, tokenId: tokenDoc.id! };
  }, E2E_FLAG);
}
