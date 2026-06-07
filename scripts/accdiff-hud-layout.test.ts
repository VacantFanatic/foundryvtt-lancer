import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const hudSource = readFileSync("src/module/apps/acc_diff/AccDiffHUD.svelte", "utf8");
const inputSource = readFileSync("src/module/apps/acc_diff/AccDiffInput.svelte", "utf8");

describe("Acc/Diff HUD layout", () => {
  it("uses dedicated section wrappers for advanced toggle and manual adjust", () => {
    assert.match(hudSource, /class="accdiff-advanced-toggle accdiff-grid__section"/);
    assert.match(hudSource, /class="accdiff-manual-adjust accdiff-grid__section"/);
    assert.doesNotMatch(hudSource, /class="flexcol accdiff-grid"[\s\S]*AccDiffInput/);
  });

  it("styles the advanced toggle button for wrapped label text", () => {
    assert.match(hudSource, /accdiff-advanced-toggle__button/);
  });

  it("wraps manual adjust controls in a single root element", () => {
    assert.match(inputSource, /class="accdiff-manual-adjust-input/);
  });
});
