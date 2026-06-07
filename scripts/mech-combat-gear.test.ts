import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompactSystemCardHtml,
  buildCompactWeaponCardHtml,
  collectCombatSystems,
  collectCombatWeapons,
  countCombatGear,
} from "../src/module/helpers/mech-combat-gear-core.ts";

describe("mech combat gear helpers", () => {
  const loadout = {
    weapon_mounts: [
      {
        type: "Main",
        bracing: false,
        slots: [
          { size: "Main", weapon: { value: { name: "Assault Rifle" } }, mod: null },
          { size: "Aux", weapon: null, mod: null },
        ],
      },
    ],
    systems: [{ value: { name: "Grenade Launcher" } }, { value: null }],
    sp: { value: 1, max: 4 },
    frame: null,
  } as never;

  it("countCombatGear counts weapons and systems", () => {
    assert.deepEqual(countCombatGear(loadout), { weaponCount: 1, systemCount: 1 });
  });

  it("collectCombatWeapons returns equipped weapons", () => {
    assert.equal(collectCombatWeapons(loadout).length, 1);
    assert.equal(collectCombatWeapons(loadout)[0]?.name, "Assault Rifle");
  });

  it("collectCombatSystems returns mounted systems", () => {
    assert.equal(collectCombatSystems(loadout).length, 1);
    assert.equal(collectCombatSystems(loadout)[0]?.name, "Grenade Launcher");
  });

  it("buildCompactWeaponCardHtml includes roll-attack control", () => {
    const html = buildCompactWeaponCardHtml("Assault Rifle", "path.weapon");
    assert.match(html, /roll-attack/);
    assert.match(html, /Assault Rifle/);
  });

  it("buildCompactSystemCardHtml includes chat-flow-button control", () => {
    const html = buildCompactSystemCardHtml("ECM Suite", "path.system");
    assert.match(html, /chat-flow-button/);
    assert.match(html, /ECM Suite/);
  });
});
