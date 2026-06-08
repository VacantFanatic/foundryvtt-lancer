import type { LancerMECH } from "../actor/lancer-actor";
import type { LancerMECH_SYSTEM, LancerMECH_WEAPON } from "../item/lancer-item";

export const COMBAT_GEAR_WEAPON_IMG_FALLBACK = "systems/lancer/assets/icons/mech_weapon.svg";
export const COMBAT_GEAR_SYSTEM_IMG_FALLBACK = "systems/lancer/assets/icons/mech_system.svg";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Resolve item art for compact combat cards, with type-specific fallbacks. */
export function combatGearItemImgSrc(img: string | undefined | null, fallback: string): string {
  const trimmed = img?.trim();
  return trimmed ? trimmed : fallback;
}

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

export function buildCompactWeaponCardHtml(weaponName: string, weaponPath: string, weaponImg?: string | null): string {
  const imgSrc = escapeAttr(combatGearItemImgSrc(weaponImg, COMBAT_GEAR_WEAPON_IMG_FALLBACK));
  return `
    <div class="mech-combat-gear-card card clipped" data-item-id="${weaponPath}">
      <img class="mech-combat-gear-thumb" src="${imgSrc}" alt="" width="32" height="32" />
      <span class="mech-combat-gear-name minor">${weaponName}</span>
      <button type="button" class="roll-attack lancer-button lancer-secondary mech-combat-action-button" data-tooltip="Roll attack">
        <i class="fas fa-dice-d20 i--4 i--dark" aria-hidden="true"></i>
        <span>FIRE</span>
      </button>
    </div>`;
}

export function buildCompactSystemCardHtml(systemName: string, systemPath: string, systemImg?: string | null): string {
  const imgSrc = escapeAttr(combatGearItemImgSrc(systemImg, COMBAT_GEAR_SYSTEM_IMG_FALLBACK));
  return `
    <div class="mech-combat-gear-card card clipped" data-item-id="${systemPath}">
      <img class="mech-combat-gear-thumb" src="${imgSrc}" alt="" width="32" height="32" />
      <span class="mech-combat-gear-name minor">${systemName}</span>
      <a class="chat-flow-button lancer-button lancer-secondary mech-combat-action-button" data-tooltip="Use system">
        <i class="mdi mdi-message i--4" aria-hidden="true"></i>
        <span>USE</span>
      </a>
    </div>`;
}
