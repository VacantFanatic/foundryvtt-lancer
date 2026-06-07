import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildMechPilotRowStatsHtml,
  buildRollStatChipHtml,
  MECH_PILOT_HASE_PATHS,
} from "../src/module/helpers/mech-pilot-row-core.ts";

describe("mech pilot row roll chips", () => {
  it("buildRollStatChipHtml renders inline label, value, and roll control", () => {
    const html = buildRollStatChipHtml({
      label: "GRIT",
      value: 0,
      dataPath: "system.grit",
      tooltip: "Roll Grit",
      rollButtonHtml: '<a class="roll-stat lancer-button" data-path="system.grit"></a>',
      extraActionHtml: '<a class="lancer-flow-button lancer-button" data-flow-type="BasicAttack"></a>',
    });

    assert.match(html, /mech-pilot-roll-chip/);
    assert.match(html, /mech-pilot-roll-chip-label">GRIT</);
    assert.match(html, /data-path="system\.grit">0</);
    assert.match(html, /roll-stat/);
    assert.match(html, /data-flow-type="BasicAttack"/);
    assert.match(html, /data-tooltip="Roll Grit"/);
  });

  it("buildMechPilotRowStatsHtml wraps chips in a horizontal flex row", () => {
    const html = buildMechPilotRowStatsHtml(['<div class="mech-pilot-roll-chip"></div>']);
    assert.match(html, /mech-pilot-roll-chips flexrow/);
  });

  it("orders HASE stats HUL, SYS, AGI, ENG", () => {
    assert.deepEqual(MECH_PILOT_HASE_PATHS, [
      { label: "HUL", path: "system.hull" },
      { label: "SYS", path: "system.sys" },
      { label: "AGI", path: "system.agi" },
      { label: "ENG", path: "system.eng" },
    ]);
  });

  it("styles the pilot row as inline chips instead of stat-cards", () => {
    const styles = readFileSync("src/styles/applications/_actor-sheet.scss", "utf8");
    const block = styles.match(/\.mech-header-pilot-row\s*\{[\s\S]*?\n  \}/);
    assert.ok(block, "expected .mech-header-pilot-row styles");
    assert.match(block[0], /\.mech-pilot-roll-chip/);
    assert.doesNotMatch(block[0], /\.stat-card/);
  });

  it("renders pilot row in the mech sheet header, not the combat tab body", () => {
    const template = readFileSync("public/templates/actor/mech.hbs", "utf8");
    const headerBlock = template.match(/<header[\s\S]*?<\/header>/);
    assert.ok(headerBlock, "expected mech sheet header");
    assert.match(headerBlock[0], /mech-combat-pilot-row/);
    const combatTab = template.match(/tab combat[\s\S]*?<\/div>\s*<div class="tab gear/);
    assert.ok(combatTab, "expected combat tab");
    assert.doesNotMatch(combatTab[0], /mech-combat-pilot-row/);
  });
});
