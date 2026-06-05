import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveImportCCPayload } from "../src/module/actor/import-routing.ts";

describe("resolveImportCCPayload", () => {
  it("routes wrapped v3 JSON exports", () => {
    const payload = {
      EXPORT_TYPE: "pilot",
      data: { callsign: "A", name: "B" },
    };
    const result = resolveImportCCPayload(payload as never);
    assert.equal(result?.route, "v3");
    assert.equal(result && "wrapper" in result && result.wrapper.data.callsign, "A");
  });

  it("wraps flat v3 share payloads with originId", () => {
    const payload = { originId: "x", callsign: "Stingray", name: "Pilot" };
    const result = resolveImportCCPayload(payload as never);
    assert.equal(result?.route, "v3");
    assert.equal(result && "wrapper" in result && result.wrapper.EXPORT_TYPE, "pilot");
    assert.equal(result && "wrapper" in result && result.wrapper.data.originId, "x");
  });

  it("routes nested data without top-level callsign to v3", () => {
    const payload = { data: { callsign: "A", name: "B" } };
    const result = resolveImportCCPayload(payload as never);
    assert.equal(result?.route, "v3");
    assert.equal(result && "wrapper" in result && result.wrapper.data.name, "B");
  });

  it("routes v2 flat pilots by callsign", () => {
    const payload = { callsign: "Legacy", name: "Pilot", id: "1" };
    const result = resolveImportCCPayload(payload as never);
    assert.equal(result?.route, "v2");
    assert.equal(result && "data" in result && result.data.callsign, "Legacy");
  });

  it("returns null for unrecognized shapes", () => {
    assert.equal(resolveImportCCPayload({} as never), null);
  });
});
