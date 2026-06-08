import type { HelperOptions } from "handlebars";
import type { LancerMECH } from "../actor/lancer-actor";
import { LancerFlowState } from "../flows/interfaces";
import { resolveHelperDotpath } from "./commons";
import { action_button, actor_flow_button, is_combatant } from "./actor";
import {
  buildCombatDockCoreToggleHtml,
  buildCombatDockStatChipsHtml,
  COMBAT_DOCK_ATTACK_FLOW_TYPES,
} from "./mech-combat-dock-core";

export {
  buildCombatDockCoreToggleHtml,
  buildCombatDockStatChipsHtml,
  COMBAT_DOCK_ATTACK_FLOW_TYPES,
  normalizeCoreEnergyFormValue,
} from "./mech-combat-dock-core";
export type { CombatDockStatSnapshot } from "./mech-combat-dock-core";

/** Attack utility buttons rendered in the persistent combat dock. */
export function buildCombatDockAttackUtilitiesHtml(): string {
  const BasicFlowType = LancerFlowState.BasicFlowType;
  const buttons = [
    actor_flow_button("M/R", BasicFlowType.BasicAttack, {} as HelperOptions),
    actor_flow_button("DMG", BasicFlowType.Damage, {} as HelperOptions),
    actor_flow_button("TECH", BasicFlowType.TechAttack, {} as HelperOptions),
  ];
  return `<div class="mech-combat-dock-attacks flexrow">${buttons.join("")}</div>`;
}

function compactOverchargeDock(actor: LancerMECH, overchargeLevel: number): string {
  const sequence = actor.system.overcharge_sequence.split(",");
  const index = Math.max(0, Math.min(sequence.length - 1, overchargeLevel));
  const value = sequence[index];
  return `
    <div class="mech-combat-dock-overcharge card clipped" data-tooltip="Overcharge">
      <button type="button" class="lancer-flow-button lancer-button lancer-secondary" data-flow-type="Overcharge" data-flow-args="{}" aria-label="Roll overcharge">
        <i class="fas fa-dice-d20 i--dark i--2" aria-hidden="true"></i>
      </button>
      <button type="button" class="overcharge-text lancer-button lancer-secondary">${value}</button>
      <button type="button" class="overcharge-reset mdi mdi-restore" aria-label="Reset overcharge"></button>
    </div>`;
}

function compactActionTracker(actor: LancerMECH, options: HelperOptions): string {
  if (!is_combatant(actor)) return "";
  const buttons = [
    action_button("P", "system.action_tracker.protocol", "protocol", options),
    action_button("M", "system.action_tracker.move", "move", options),
    action_button("F", "system.action_tracker.full", "full", options),
    action_button("Q", "system.action_tracker.quick", "quick", options),
    action_button("R", "system.action_tracker.reaction", "reaction", options),
  ];
  return `<div class="mech-combat-dock-actions flexrow">${buttons.join("")}</div>`;
}

/** Handlebars helper: persistent combat dock visible on every mech sheet tab. */
export function mechCombatDock(options: HelperOptions): string {
  const actor = (options.data?.root?.actor ?? resolveHelperDotpath(options, "actor")) as LancerMECH | undefined;
  if (!actor?.is_mech()) return "";

  const system = actor.system;
  const statChips = buildCombatDockStatChipsHtml({
    hp: system.hp,
    heat: system.heat,
    structure: system.structure,
    stress: system.stress,
  });
  const overcharge = compactOverchargeDock(actor, system.overcharge);
  const core = buildCombatDockCoreToggleHtml(system.core_energy);
  const actions = compactActionTracker(actor, options);
  const attacks = buildCombatDockAttackUtilitiesHtml();

  return `
    <aside class="mech-combat-dock card clipped" aria-label="${game.i18n.localize("lancer.mech-sheet.combat-dock.label")}">
      ${statChips}
      <div class="mech-combat-dock-controls flexrow">
        ${overcharge}
        ${core}
        ${actions}
        ${attacks}
      </div>
    </aside>`;
}
