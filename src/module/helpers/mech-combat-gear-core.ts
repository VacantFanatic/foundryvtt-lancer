import type { LancerMECH } from "../actor/lancer-actor";
import type { LancerMECH_SYSTEM, LancerMECH_WEAPON } from "../item/lancer-item";

export interface CombatGearCounts {
  weaponCount: number;
  systemCount: number;
}

/** Count equipped weapons and mounted systems for compact combat strips. */
export function countCombatGear(loadout: LancerMECH["system"]["loadout"]): CombatGearCounts {
  let weaponCount = 0;
  for (const mount of loadout.weapon_mounts) {
    for (const slot of mount.slots) {
      if (slot.weapon?.value) weaponCount++;
    }
  }
  return {
    weaponCount,
    systemCount: loadout.systems.filter(s => !!s.value).length,
  };
}

/** Collect equipped weapons from all mount slots. */
export function collectCombatWeapons(loadout: LancerMECH["system"]["loadout"]): LancerMECH_WEAPON[] {
  const weapons: LancerMECH_WEAPON[] = [];
  for (const mount of loadout.weapon_mounts) {
    for (const slot of mount.slots) {
      const weapon = slot.weapon?.value;
      if (weapon) weapons.push(weapon);
    }
  }
  return weapons;
}

/** Collect mounted systems. */
export function collectCombatSystems(loadout: LancerMECH["system"]["loadout"]): LancerMECH_SYSTEM[] {
  return loadout.systems.map(s => s.value).filter((s): s is LancerMECH_SYSTEM => !!s);
}

export function buildCompactWeaponCardHtml(weaponName: string, weaponPath: string): string {
  return `
    <div class="mech-combat-gear-card card clipped" data-item-id="${weaponPath}">
      <span class="mech-combat-gear-name minor">${weaponName}</span>
      <button type="button" class="roll-attack lancer-button lancer-secondary" data-tooltip="Roll attack">
        <i class="fas fa-dice-d20 i--4 i--dark" aria-hidden="true"></i>
        <span>FIRE</span>
      </button>
    </div>`;
}

export function buildCompactSystemCardHtml(systemName: string, systemPath: string): string {
  return `
    <div class="mech-combat-gear-card card clipped" data-item-id="${systemPath}">
      <span class="mech-combat-gear-name minor">${systemName}</span>
      <a class="chat-flow-button lancer-button lancer-secondary" data-tooltip="Use system">
        <i class="mdi mdi-message i--4" aria-hidden="true"></i>
        <span>USE</span>
      </a>
    </div>`;
}
