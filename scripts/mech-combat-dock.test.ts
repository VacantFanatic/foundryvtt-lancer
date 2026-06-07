import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCombatDockStatChipsHtml,
  COMBAT_DOCK_ATTACK_FLOW_TYPES,
} from "../src/module/helpers/mech-combat-dock-core.ts";

describe("mech combat dock helpers", () => {
  it("buildCombatDockStatChipsHtml renders HP, heat, structure, and stress", () => {
    const html = buildCombatDockStatChipsHtml({
      hp: { value: 1, max: 12 },
      heat: { value: 0, max: 6 },
      structure: { value: 4, max: 4 },
      stress: { value: 4, max: 4 },
    });
    assert.match(html, /mech-combat-dock-stat/);
    assert.match(html, /system\.hp\.value/);
    assert.match(html, /system\.heat\.value/);
    assert.match(html, /system\.structure\.value/);
    assert.match(html, /system\.stress\.value/);
  });

  it("combat dock attack utilities include all three flow types", () => {
    assert.deepEqual(COMBAT_DOCK_ATTACK_FLOW_TYPES, ["BasicAttack", "Damage", "TechAttack"]);
  });
});
