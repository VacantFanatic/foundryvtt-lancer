import { expect, test } from "@playwright/test";
import { joinLancerWorld } from "../helpers/foundry";
import { seedRegressionWorld } from "../helpers/seed";

test.describe("Combat loop @regression", () => {
  test.beforeEach(async ({ page }) => {
    await joinLancerWorld(page);
    await seedRegressionWorld(page);
  });

  test("combat tour is registered with damage-loop steps", async ({ page }) => {
    const tour = await page.evaluate(() => {
      const t = game.tours.get("lancer.combat");
      if (!t) return null;
      return {
        id: t.id,
        stepIds: t.steps.map(s => s.id),
      };
    });

    expect(tour).not.toBeNull();
    expect(tour?.stepIds).toEqual(
      expect.arrayContaining(["attackDamageLoop", "manualDamage", "autoDamagePrompt", "applyDamage"])
    );
  });

  test("printAttackCard stores attackReroll flag and reroll button markup", async ({ page }) => {
    const seed = await seedRegressionWorld(page);
    const result = await page.evaluate(async ({ tokenId }) => {
      const npc = game.actors.find(a => a.name === "E2E Test NPC");
      const weapon = npc?.items.find(i => i.name === "E2E Test Weapon");
      const tokenDoc = game.scenes.active?.tokens.get(tokenId);
      const token = tokenDoc?.object;
      if (!npc || !weapon || !token) throw new Error("E2E seed data missing");

      const roll = await new Roll("1d20+5").evaluate();
      const printStep = game.lancer.flowSteps.get("printAttackCard");
      if (!printStep) throw new Error("printAttackCard step missing");

      const state = {
        name: "WeaponAttackFlow",
        actor: npc,
        item: weapon,
        currentStep: "printAttackCard",
        data: {
          type: "weapon",
          title: weapon.name,
          grit: 1,
          flat_bonus: 0,
          attack_type: 1,
          action: null,
          is_smart: false,
          attack_rolls: { roll: "1d20+5", targeted: [] },
          attack_results: [{ roll, tt: await roll.getTooltip() }],
          hit_results: [
            {
              target: token,
              total: String(roll.total).padStart(2, "0"),
              hit: true,
              crit: false,
              usedLockOn: false,
            },
          ],
          reroll_data: "",
          tags: [],
          acc_diff: {
            toObject() {
              return {
                weapon: {},
                base: { grit: 1, flatBonus: 0, accuracy: 0, difficulty: 0, cover: 0, plugins: {} },
                targets: [
                  {
                    token: token.document.uuid,
                    accuracy: 0,
                    difficulty: 0,
                    cover: 0,
                    plugins: {},
                  },
                ],
                title: weapon.name,
              };
            },
          },
        },
      };

      await printStep(state);
      const cm = game.messages.contents.at(-1);
      return {
        hasRerollFlag: !!cm?.getFlag("lancer", "attackReroll"),
        hasAttackData: !!cm?.getFlag("lancer", "attackData"),
        html: cm?.content ?? "",
      };
    }, seed);

    expect(result.hasAttackData).toBe(true);
    expect(result.hasRerollFlag).toBe(true);
    expect(result.html).toContain("lancer-attack-reroll");
  });
});
