import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveGearTabMode, shouldShowLoadoutEditor } from "../src/module/helpers/mech-gear-mode-core.ts";

describe("mech gear mode helpers", () => {
  it("resolveGearTabMode defaults to play", () => {
    assert.equal(resolveGearTabMode(undefined), "play");
    assert.equal(resolveGearTabMode("play"), "play");
    assert.equal(resolveGearTabMode("edit"), "edit");
  });

  it("shouldShowLoadoutEditor is true only in edit mode", () => {
    assert.equal(shouldShowLoadoutEditor("play"), false);
    assert.equal(shouldShowLoadoutEditor("edit"), true);
  });
});
