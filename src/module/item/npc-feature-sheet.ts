import { LANCER } from "../config";
import { EntryType, NpcFeatureType } from "../enums";
import type { SystemTemplates } from "../system-template";
import { LancerItemSheet } from "./item-sheet";
import * as defaults from "../util/unpacking/defaults";
import { Damage } from "../models/bits/damage";
const lp = LANCER.log_prefix;

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerNPCFeatureSheet extends LancerItemSheet<EntryType.NPC_FEATURE> {
  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  override activateListeners(html: HTMLElement): void {
    super.activateListeners(html);

    if (!this.isEditable) return;

    $(html)
      .find(".npc-damage-append")
      .on("click", _e => {
        console.log("NPC damage append");
        if (!this.item.is_npc_feature() || this.item.system.type !== NpcFeatureType.Weapon) return;
        const damages = (this.item.system as unknown as SystemTemplates.NPC.WeaponData).damage;
        damages[0].push(new Damage(defaults.DAMAGE()));
        damages[1].push(new Damage(defaults.DAMAGE()));
        damages[2].push(new Damage(defaults.DAMAGE()));
        console.log("new damages", damages);
        this.item.update({
          "system.damage": damages,
        });
      });
  }
}
