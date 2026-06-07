import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countActiveEffects, formatEffectsTabLabel } from "../src/module/helpers/mech-sheet-ux-core.ts";

describe("mech sheet UX polish helpers", () => {
  it("countActiveEffects sums effects in all categories", () => {
    const total = countActiveEffects([{ effects: [1, 2] }, { effects: [3] }, { effects: [] }]);
    assert.equal(total, 3);
  });

  it("formatEffectsTabLabel appends count when non-zero", () => {
    assert.equal(formatEffectsTabLabel("<EFFECTS//ACTIVE>", 0), "<EFFECTS//ACTIVE>");
    assert.equal(formatEffectsTabLabel("<EFFECTS//ACTIVE>", 3), "<EFFECTS//ACTIVE> (3)");
  });
});
