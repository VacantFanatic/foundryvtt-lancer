import type { HelperOptions } from "handlebars";
import type { LancerMECH, LancerPILOT } from "../actor/lancer-actor";
import { basicAttackButton, getActorUUID, rollStatButton } from "./actor";
import { resolveHelperDotpath } from "./commons";
import { pilotSlot } from "./loadout";
import { buildMechPilotRowStatsHtml, buildRollStatChipHtml, MECH_PILOT_HASE_PATHS } from "./mech-pilot-row-core";

export {
  buildMechPilotRowStatsHtml,
  buildRollStatChipHtml,
  MECH_PILOT_HASE_PATHS,
} from "./mech-pilot-row-core";
export type { RollStatChipSpec } from "./mech-pilot-row-core";

function pilotStatTooltip(key: string): string {
  return game.i18n.localize(`lancer.pilot-sheet.stat-tooltip.${key}`);
}

/** Handlebars helper: compact pilot portrait + grit/HASE roll chips + inventory. */
export function mechCombatPilotRow(options: HelperOptions): string {
  const actor = options.data?.root?.actor as LancerMECH | undefined;
  if (!actor?.is_mech()) return "";

  const uuid = getActorUUID(options);
  if (!uuid) return "";

  const pilot = options.hash.pilot as LancerPILOT | undefined;
  const portrait = pilotSlot("system.pilot", { ...options, hash: { ...options.hash, value: pilot } });

  const gritChip = buildRollStatChipHtml({
    label: "GRIT",
    value: resolveHelperDotpath(options, "system.grit", 0),
    dataPath: "system.grit",
    tooltip: pilotStatTooltip("grit"),
    rollButtonHtml: rollStatButton(uuid, "system.grit"),
    extraActionHtml: basicAttackButton(uuid, {
      icon: "cci cci-weapon",
      tooltip: "Roll a basic attack",
    }),
  });

  const haseChips = MECH_PILOT_HASE_PATHS.map(({ label, path }) => {
    const tooltipKey = path.replace("system.", "");
    return buildRollStatChipHtml({
      label,
      value: resolveHelperDotpath(options, path, 0),
      dataPath: path,
      tooltip: pilotStatTooltip(tooltipKey),
      rollButtonHtml: rollStatButton(uuid, path),
    });
  });

  const stats = buildMechPilotRowStatsHtml([gritChip, ...haseChips]);
  const inventoryLabel = game.i18n.localize("lancer.mech-sheet.inventory.label");

  return `
    <div class="mech-header-pilot-row flexrow">
      ${portrait}
      ${stats}
      <div class="inventory card clipped">
        <button class="lancer-button" type="button">${inventoryLabel}</button>
      </div>
    </div>`;
}
