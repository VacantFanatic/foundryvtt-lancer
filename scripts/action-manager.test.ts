import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildActionManagerRenderContext,
  resolveActionManagerWidth,
  isTokenInCombatEncounter,
  resolveActionManagerActor,
  shouldShowActionManagerSurface,
} from "../src/module/action/action-manager-context.ts";

function mechActor(name = "Test Mech") {
  return {
    name,
    is_mech: () => true,
    is_npc: () => false,
    system: {
      action_tracker: {
        protocol: true,
        move: 4,
        full: true,
        quick: true,
        reaction: true,
      },
    },
  };
}

describe("action manager context", () => {
  it("detects combat encounter membership from combatant or inCombat", () => {
    assert.equal(isTokenInCombatEncounter({ combatant: { id: "c1" } }), true);
    assert.equal(isTokenInCombatEncounter({ inCombat: true }), true);
    assert.equal(isTokenInCombatEncounter({}), false);
  });

  it("resolves mech and npc actors that are in combat", () => {
    const actor = mechActor();
    const resolved = resolveActionManagerActor({ actor, inCombat: true });
    assert.equal(resolved, actor);
    assert.equal(resolveActionManagerActor({ actor, inCombat: false }), null);
  });

  it("builds render context without invalid inline height values", () => {
    const actor = mechActor();
    const context = buildActionManagerRenderContext({
      actor,
      clickable: true,
      showTextLabels: false,
      position: { width: 300 },
    });

    assert.equal(context.name, "TEST MECH");
    assert.equal(context.actions?.move, 4);
    assert.equal(context.positionWidth, 300);
    assert.equal(shouldShowActionManagerSurface(context), true);
  });

  it("hides the surface when no actor is selected", () => {
    const context = buildActionManagerRenderContext({
      actor: null,
      clickable: true,
      showTextLabels: false,
      position: { width: 300 },
    });
    assert.equal(shouldShowActionManagerSurface(context), false);
  });

  it("resolves numeric widths for the surface style", () => {
    assert.equal(resolveActionManagerWidth({ width: 280 }), 280);
    assert.equal(resolveActionManagerWidth({ width: "320" }), 320);
    assert.equal(resolveActionManagerWidth({}), 300);
  });
});
