import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function mechHeaderBlock(): string {
  const styles = readFileSync("src/styles/applications/_actor-sheet.scss", "utf8");
  const match = styles.match(/\.lancer\.sheet header\.sheet-header\.lancer-mech-sheet-header\s*\{[\s\S]*?\n  \}/);
  assert.ok(match, "expected .lancer-mech-sheet-header styles");
  return match[0];
}

describe("mech sheet header layout", () => {
  it("right-aligns pilot and frame details in the header", () => {
    const block = mechHeaderBlock();
    const details = block.match(/\.header-details\s*\{[\s\S]*?\}/);
    assert.ok(details, "expected .header-details override in mech header");
    assert.match(details[0], /text-align:\s*right/);
    assert.match(details[0], /justify-content:\s*flex-end/);
  });

  it("uses a much larger pilot portrait in the header row", () => {
    const styles = readFileSync("src/styles/applications/_actor-sheet.scss", "utf8");
    const row = styles.match(/\.mech-header-pilot-row\s*\{[\s\S]*?\n  \}/);
    assert.ok(row, "expected .mech-header-pilot-row styles");
    const portrait = row[0].match(/\.pilot-summary\s*\{[\s\S]*?\}/);
    assert.ok(portrait, "expected .pilot-summary in pilot row");
    const widthMatch = portrait[0].match(/width:\s*([\d.]+)rem/);
    assert.ok(widthMatch, "expected pilot portrait width in rem");
    assert.ok(Number(widthMatch[1]) >= 7, "pilot portrait should be at least 7rem wide");
  });

  it("fills the mech portrait container in the header", () => {
    const block = mechHeaderBlock();
    const container = block.match(/\.portrait-img-container\s*\{[\s\S]*?\}/);
    assert.ok(container, "expected .portrait-img-container override in mech header");
    assert.match(container[0], /width:\s*100%/);
    assert.match(container[0], /height:\s*100%/);

    const img = block.match(/\.portrait-img-container[\s\S]*?img\.portrait-img\s*\{[\s\S]*?\}/);
    assert.ok(img, "expected mech header portrait img styles");
    assert.match(img[0], /width:\s*100%/);
    assert.match(img[0], /height:\s*100%/);
    assert.match(img[0], /object-fit:\s*cover/);
    assert.match(img[0], /max-width:\s*none/);
    assert.match(img[0], /max-height:\s*none/);
  });
});
