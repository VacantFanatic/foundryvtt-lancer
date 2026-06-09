import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMBAT_TRACKER_DISPOSITION_CLASSES,
  enrichCombatTrackerTurns,
  mergeCombatTrackerContext,
  type CombatTrackerTurnInput,
} from "../src/module/combat/combat-tracker-turns.ts";

const appearance = { icon: "cci cci-activate", deactivate: "cci cci-deactivate" };

function turn(id: string, css = "", pending = 1): CombatTrackerTurnInput {
  return { id, css, name: id, img: "", hidden: false, isDefeated: false, canPing: false, resource: null, pending };
}

describe("combat tracker turns", () => {
  it("enriches turns with disposition classes and activation buttons", () => {
    const combatant = {
      id: "c1",
      disposition: 2,
      activations: { max: 2, value: 1 },
    };
    const result = enrichCombatTrackerTurns({
      turns: [turn("c1")],
      getCombatant: id => (id === "c1" ? combatant : undefined),
      activeCombatantId: "c1",
      appearance,
      sort: false,
    });

    assert.equal(result?.length, 1);
    assert.match(result![0].css, /player/);
    assert.equal(result![0].activations, 2);
    assert.equal(result![0].pending, 1);
    assert.equal(result![0].buttons.length, 2);
    assert.equal(result![0].buttons[0].action, "activateCombatantTurn");
    assert.equal(result![0].buttons[1].action, "deactivateCombatantTurn");
  });

  it("sorts active and pending turns when sort is enabled", () => {
    const combatants = new Map([
      ["a", { id: "a", disposition: 0, activations: { max: 1, value: 0 } }],
      ["b", { id: "b", disposition: 0, activations: { max: 1, value: 1 } }],
    ]);
    const result = enrichCombatTrackerTurns({
      turns: [turn("a", "active", 0), turn("b", "", 1)],
      getCombatant: id => combatants.get(id),
      appearance,
      sort: true,
    });

    assert.deepEqual(
      result?.map(t => t.id),
      ["a", "b"]
    );
  });

  it("returns undefined when turns are undefined", () => {
    const result = enrichCombatTrackerTurns({
      turns: undefined,
      getCombatant: () => undefined,
      appearance,
      sort: false,
    });
    assert.equal(result, undefined);
  });

  it("exposes disposition classes for all combatant types", () => {
    assert.equal(COMBAT_TRACKER_DISPOSITION_CLASSES[2], "player");
    assert.equal(COMBAT_TRACKER_DISPOSITION_CLASSES[-1], "enemy");
  });

  it("mergeCombatTrackerContext keeps turns when super returns tracker-only fields", () => {
    const ctx = {
      user: { isGM: true },
      turns: [turn("c1")],
    };
    const merged = mergeCombatTrackerContext(ctx, { hasDecimals: false });
    assert.equal(merged.turns?.length, 1);
    assert.equal(merged.turns?.[0]?.id, "c1");
    assert.equal((merged as { user?: { isGM: boolean } }).user?.isGM, true);
  });
});
