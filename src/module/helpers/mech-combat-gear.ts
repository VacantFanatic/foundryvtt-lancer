import type { HelperOptions } from "handlebars";
import type { LancerMECH } from "../actor/lancer-actor";
import type { LancerMECH_WEAPON } from "../item/lancer-item";
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

function weaponProfileStats(weapon: LancerMECH_WEAPON): string {
  const profile = weapon.currentProfile();
  const ranges = profile.range
    .map(
      r =>
        `<span class="compact-range" data-tooltip="${r.type}"><i class="cci cci-${r.type.toLowerCase()}" aria-hidden="true"></i>${r.val}</span>`
    )
    .join("");
  // Render each damage entry as a roll-damage button so clicking it starts a
  // standalone damage roll without requiring an attack roll first.
  const damages = (profile.damage ?? [])
    .map(
      d =>
        `<a class="compact-damage roll-damage lancer-button" data-tooltip="Roll damage" data-uuid="${weapon.uuid}" style="max-width: min-content;"><i class="cci cci-${d.type.toLowerCase()} damage--${d.type.toLowerCase()}" aria-hidden="true"></i>${d.val}</a>`
    )
    .join("");
  if (!ranges && !damages) return "";
  const sep = ranges && damages ? `<span class="mech-combat-gear-sep">//</span>` : "";
  return `<div class="mech-combat-gear-stats">${ranges}${sep}${damages}</div>`;
}

function renderWeaponCards(mech: LancerMECH, options: HelperOptions): string {
  const cards: string[] = [];
  const loadout = mech.system.loadout;
  loadout.weapon_mounts.forEach((mount, mountIndex) => {
    mount.slots.forEach((slot, slotIndex) => {
      const weapon = slot.weapon?.value;
      if (!weapon) return;
      const weaponPath = `system.loadout.weapon_mounts.${mountIndex}.slots.${slotIndex}.weapon.value`;
      const stats = weaponProfileStats(weapon);
      cards.push(`
        <div class="mech-combat-gear-card card clipped ref set" ${ref_params(weapon, weaponPath)}>
          <img class="mech-combat-gear-thumb" src="${weapon.img || "systems/lancer/assets/icons/mech_weapon.svg"}" alt="" width="32" height="32" />
          <div class="mech-combat-gear-label">
            <span class="mech-combat-gear-name minor">${weapon.name}</span>
            ${stats}
          </div>
          <button type="button" class="roll-attack lancer-button lancer-secondary mech-combat-action-button" data-tooltip="Roll attack" data-uuid="${weapon.uuid}">
            <i class="cci cci-weapon" aria-hidden="true"></i>
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
        <img class="mech-combat-gear-thumb" src="${system.img || "systems/lancer/assets/icons/mech_system.svg"}" alt="" width="32" height="32" />
        <span class="mech-combat-gear-name minor">${system.name}</span>
        <a class="chat-flow-button lancer-button lancer-secondary mech-combat-action-button" data-tooltip="Use system" data-uuid="${system.uuid}">
          <i class="cci cci-activate" aria-hidden="true"></i>
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
