import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const HTML_EDITOR_TEMPLATE = resolve("public/templates/window/html_editor.hbs");

describe("HTML editor dialog template", () => {
  it("does not use the legacy {{editor}} helper (unsupported in Application V2)", () => {
    const template = readFileSync(HTML_EDITOR_TEMPLATE, "utf8");
    assert.doesNotMatch(template, /\{\{editor\b/);
  });

  it("provides a prose-mirror mount point for HTMLEditDialog", () => {
    const template = readFileSync(HTML_EDITOR_TEMPLATE, "utf8");
    assert.match(template, /data-prose-mirror-mount/);
  });
});
