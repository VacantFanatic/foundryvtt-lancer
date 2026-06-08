import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCombatDockCoreToggleHtml,
  buildCombatDockStatChipsHtml,
  COMBAT_DOCK_ATTACK_FLOW_TYPES,
  normalizeCoreEnergyFormValue,
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

  it("buildCombatDockCoreToggleHtml uses Number dtype for core_energy schema", () => {
    const html = buildCombatDockCoreToggleHtml(1);
    assert.match(html, /name="system\.core_energy"/);
    assert.match(html, /data-dtype="Number"/);
    assert.match(html, /value="1"/);
    assert.doesNotMatch(html, /data-dtype="Boolean"/);
    assert.match(html, /checked/);
  });

  it("buildCombatDockCoreToggleHtml omits checked when core energy is spent", () => {
    const html = buildCombatDockCoreToggleHtml(0);
    assert.doesNotMatch(html, /checked/);
  });

  it("normalizeCoreEnergyFormValue coerces legacy boolean form values to 0 or 1", () => {
    assert.equal(normalizeCoreEnergyFormValue(true), 1);
    assert.equal(normalizeCoreEnergyFormValue(false), 0);
    assert.equal(normalizeCoreEnergyFormValue(1), 1);
    assert.equal(normalizeCoreEnergyFormValue(0), 0);
    assert.equal(normalizeCoreEnergyFormValue("1"), 1);
    assert.equal(normalizeCoreEnergyFormValue("0"), 0);
  });
});
