import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("inventory dialog scrolling", () => {
  it("uses a bounded window height and scrollY target", () => {
    const source = readFileSync("src/module/apps/inventory.ts", "utf8");
    assert.match(source, /position:\s*\{\s*width:\s*600,\s*height:\s*520\s*\}/);
    assert.match(source, /scrollY:\s*\["\.inventory-editor-body"\]/);
    assert.match(source, /resizable:\s*true/);
    assert.doesNotMatch(source, /height:\s*"auto"/);
  });

  it("renders inventory categories inside a scrollable body", () => {
    const template = readFileSync("public/templates/window/inventory.hbs", "utf8");
    assert.match(template, /inventory-editor-body/);
    assert.match(template, /scroll-body/);
  });

  it("styles the inventory editor body as the scrollport", () => {
    const styles = readFileSync("src/styles/applications/_actor-sheet.scss", "utf8");
    const block = styles.match(/\.inventory-editor-body\s*\{[\s\S]*?\}/);
    assert.ok(block, "expected .inventory-editor-body styles");
    assert.match(block[0], /overflow-y:\s*auto|overflow-y:\s*scroll/);
    assert.match(block[0], /min-height:\s*0/);
  });
});
