export interface CombatDockStatSnapshot {
  hp: { value: number; max: number };
  heat: { value: number; max: number };
  structure: { value: number; max: number };
  stress: { value: number; max: number };
}

export const COMBAT_DOCK_ATTACK_FLOW_TYPES = ["BasicAttack", "Damage", "TechAttack"] as const;

/** Pure stat chip markup for unit tests and sheet render. */
export function buildCombatDockStatChipsHtml(stats: CombatDockStatSnapshot): string {
  const chip = (label: string, value: number, max: number, valuePath: string, icon: string) =>
    `
    <div class="mech-combat-dock-stat card clipped" data-tooltip="${label}">
      <i class="${icon} i--3" aria-hidden="true"></i>
      <span class="mech-combat-dock-stat-label">${label}</span>
      <span class="mech-combat-dock-stat-value">
        <input class="lancer-stat minor" type="number" name="${valuePath}" value="${value}" data-dtype="Number" />
        /
        <span class="lancer-stat minor">${max}</span>
      </span>
    </div>`;

  return `<div class="mech-combat-dock-stats flexrow">
    ${chip("HP", stats.hp.value, stats.hp.max, "system.hp.value", "mdi mdi-heart-outline")}
    ${chip("HEAT", stats.heat.value, stats.heat.max, "system.heat.value", "cci cci-heat")}
    ${chip("STRUCT", stats.structure.value, stats.structure.max, "system.structure.value", "cci cci-structure")}
    ${chip("STRESS", stats.stress.value, stats.stress.max, "system.stress.value", "cci cci-reactor")}
  </div>`;
}
