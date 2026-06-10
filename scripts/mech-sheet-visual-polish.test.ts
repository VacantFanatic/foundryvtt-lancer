import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildCompactSystemCardHtml,
  buildCompactWeaponCardHtml,
  COMBAT_GEAR_SYSTEM_IMG_FALLBACK,
  COMBAT_GEAR_WEAPON_IMG_FALLBACK,
  combatGearItemImgSrc,
} from "../src/module/helpers/mech-combat-gear-core.ts";
import { buildInventoryButtonHtml } from "../src/module/helpers/mech-pilot-row-core.ts";

describe("mech sheet visual polish", () => {
  it("combatGearItemImgSrc falls back when img is empty", () => {
    assert.equal(combatGearItemImgSrc("", COMBAT_GEAR_WEAPON_IMG_FALLBACK), COMBAT_GEAR_WEAPON_IMG_FALLBACK);
    assert.equal(combatGearItemImgSrc("  ", COMBAT_GEAR_SYSTEM_IMG_FALLBACK), COMBAT_GEAR_SYSTEM_IMG_FALLBACK);
    assert.equal(combatGearItemImgSrc("icons/weapon.png", COMBAT_GEAR_WEAPON_IMG_FALLBACK), "icons/weapon.png");
  });

  it("buildCompactWeaponCardHtml renders a visible item thumbnail", () => {
    const html = buildCompactWeaponCardHtml("Assault Rifle", "path.weapon", "icons/rifle.png");
    assert.match(html, /mech-combat-gear-thumb/);
    assert.match(html, /src="icons\/rifle\.png"/);
    assert.match(html, /mech-combat-action-button/);
  });

  it("buildCompactSystemCardHtml renders a visible item thumbnail", () => {
    const html = buildCompactSystemCardHtml("ECM Suite", "path.system", null);
    assert.match(html, /mech-combat-gear-thumb/);
    const escapedFallback = COMBAT_GEAR_SYSTEM_IMG_FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(html, new RegExp(`src="${escapedFallback}"`));
    assert.match(html, /mech-combat-action-button/);
  });

  it("buildInventoryButtonHtml uses secondary polish classes and icon", () => {
    const html = buildInventoryButtonHtml("View Inventory");
    assert.match(html, /mech-inventory-button/);
    assert.match(html, /lancer-secondary/);
    assert.match(html, /fa-box-open/);
    assert.match(html, /View Inventory/);
  });

  it("styles pilot portrait, chips, and combat gear action buttons", () => {
    const styles = readFileSync("src/styles/applications/_actor-sheet.scss", "utf8");
    assert.match(styles, /\.mech-header-pilot-row[\s\S]*\.pilot-summary[\s\S]*box-shadow/);
    assert.match(styles, /\.mech-header-pilot-row[\s\S]*filter:\s*brightness/);
    assert.match(styles, /\.mech-pilot-roll-chip[\s\S]*border-top/);
    assert.match(styles, /\.mech-combat-gear-thumb/);
    assert.match(styles, /\.mech-combat-gear-card[\s\S]*\.roll-attack/);
    assert.match(styles, /\.mech-combat-gear-card[\s\S]*\.chat-flow-button/);
    assert.match(styles, /\.mech-inventory-button/);
  });
});
