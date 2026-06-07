import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const actorSheetStyles = readFileSync("src/styles/applications/_actor-sheet.scss", "utf8");

describe("mech combat pilot row compact layout", () => {
  it("does not stretch stat cards to the pilot portrait height", () => {
    const block = actorSheetStyles.match(/\.mech-combat-pilot-row\s*\{[\s\S]*?\n  \}/);
    assert.ok(block, "expected .mech-combat-pilot-row styles");
    assert.match(block[0], /align-items:\s*flex-start/);
  });

  it("uses fixed grid tracks for grit and hase stat cards", () => {
    assert.match(actorSheetStyles, /\.mech-combat-pilot-row[\s\S]*grid-template:\s*minmax\(/);
  });

  it("constrains the pilot portrait slot", () => {
    assert.match(actorSheetStyles, /\.mech-combat-pilot-row[\s\S]*\.pilot-summary[\s\S]*flex:\s*0\s+0/);
  });
});
