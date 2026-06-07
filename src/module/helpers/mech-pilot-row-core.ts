export interface RollStatChipSpec {
  label: string;
  value: string | number;
  dataPath: string;
  tooltip?: string;
  rollButtonHtml: string;
  extraActionHtml?: string;
}

/** HASE display order on the mech combat pilot row (matches Lancer mnemonic). */
export const MECH_PILOT_HASE_PATHS = [
  { label: "HUL", path: "system.hull" },
  { label: "SYS", path: "system.sys" },
  { label: "AGI", path: "system.agi" },
  { label: "ENG", path: "system.eng" },
] as const;

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Inline roll chip markup (dock-style) for grit and HASE stats. */
export function buildRollStatChipHtml(spec: RollStatChipSpec): string {
  const tooltip = spec.tooltip ? ` data-tooltip="${escapeAttr(spec.tooltip)}"` : "";
  const extra = spec.extraActionHtml ?? "";
  return `
    <div class="mech-pilot-roll-chip card clipped"${tooltip}>
      <span class="mech-pilot-roll-chip-label">${spec.label}</span>
      <span class="mech-pilot-roll-chip-value lancer-stat minor" data-path="${spec.dataPath}">${spec.value}</span>
      <span class="mech-pilot-roll-chip-actions flexrow">${spec.rollButtonHtml}${extra}</span>
    </div>`;
}

/** Horizontal strip of roll chips between portrait and inventory. */
export function buildMechPilotRowStatsHtml(chips: string[]): string {
  return `<div class="mech-pilot-roll-chips flexrow">${chips.join("")}</div>`;
}
