import type { HelperOptions } from "handlebars";
import type { LancerMECH } from "../actor/lancer-actor";
import { resolveHelperDotpath } from "./commons";
import {
  buildCompactSystemCardHtml,
  buildCompactWeaponCardHtml,
  collectCombatSystems,
  collectCombatWeapons,
  countCombatGear,
} from "./mech-combat-gear-core";
import { ref_params } from "./refs";

export {
  buildCompactSystemCardHtml,
  buildCompactWeaponCardHtml,
  collectCombatSystems,
  collectCombatWeapons,
  countCombatGear,
} from "./mech-combat-gear-core";
export type { CombatGearCounts } from "./mech-combat-gear-core";

function renderWeaponCards(mech: LancerMECH, options: HelperOptions): string {
  const cards: string[] = [];
  const loadout = mech.system.loadout;
  loadout.weapon_mounts.forEach((mount, mountIndex) => {
    mount.slots.forEach((slot, slotIndex) => {
      const weapon = slot.weapon?.value;
      if (!weapon) return;
      const weaponPath = `system.loadout.weapon_mounts.${mountIndex}.slots.${slotIndex}.weapon.value`;
      cards.push(`
        <div class="mech-combat-gear-card card clipped ref set" ${ref_params(weapon, weaponPath)}>
          <span class="mech-combat-gear-name minor">${weapon.name}</span>
          <button type="button" class="roll-attack lancer-button lancer-secondary" data-tooltip="Roll attack">
            <i class="fas fa-dice-d20 i--4 i--dark" aria-hidden="true"></i>
            <span>FIRE</span>
          </button>
        </div>`);
    });
  });
  return cards.join("");
}

function renderSystemCards(mech: LancerMECH): string {
  const cards: string[] = [];
  mech.system.loadout.systems.forEach((sysRef, index) => {
    const system = sysRef.value;
    if (!system) return;
    const systemPath = `system.loadout.systems.${index}.value`;
    cards.push(`
      <div class="mech-combat-gear-card card clipped ref set" ${ref_params(system, systemPath)}>
        <span class="mech-combat-gear-name minor">${system.name}</span>
        <a class="chat-flow-button lancer-button lancer-secondary" data-tooltip="Use system">
          <i class="mdi mdi-message i--4" aria-hidden="true"></i>
          <span>USE</span>
        </a>
      </div>`);
  });
  return cards.join("");
}

/** Compact weapon fire cards for the Stats/Combat tab. */
export function mechCombatWeapons(options: HelperOptions): string {
  const actor = (options.data?.root?.actor ?? resolveHelperDotpath(options, "actor")) as LancerMECH | undefined;
  if (!actor?.is_mech()) return "";

  const cards = renderWeaponCards(actor, options);
  const body =
    cards ||
    `<p class="mech-combat-gear-empty note">${game.i18n.localize("lancer.mech-sheet.combat-gear.no-weapons")}</p>`;

  return `
    <section class="mech-combat-gear-section" data-mech-section="combat-weapons">
      <div class="lancer-header lancer-primary sheet-section-header">
        <span class="major">${game.i18n.localize("lancer.mech-sheet.combat-gear.weapons")}</span>
      </div>
      <div class="mech-combat-gear-grid flexrow wraprow">${body}</div>
    </section>`;
}

/** Compact system use cards for the Stats/Combat tab. */
export function mechCombatSystems(options: HelperOptions): string {
  const actor = (options.data?.root?.actor ?? resolveHelperDotpath(options, "actor")) as LancerMECH | undefined;
  if (!actor?.is_mech()) return "";

  const cards = renderSystemCards(actor);
  const body =
    cards ||
    `<p class="mech-combat-gear-empty note">${game.i18n.localize("lancer.mech-sheet.combat-gear.no-systems")}</p>`;

  return `
    <section class="mech-combat-gear-section" data-mech-section="combat-systems">
      <div class="lancer-header lancer-primary sheet-section-header">
        <span class="major">${game.i18n.localize("lancer.mech-sheet.combat-gear.systems")}</span>
      </div>
      <div class="mech-combat-gear-grid flexrow wraprow">${body}</div>
    </section>`;
}
