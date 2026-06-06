import type { LancerActorSheetData } from "../interfaces";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { resolveDotpath } from "../helpers/commons";
import type { LancerMECH } from "./lancer-actor";
import type { ResolvedDropData } from "../helpers/dragdrop";
import { EntryType, fittingsForMount, MountType } from "../enums";
import type { SourceData } from "../source-template";

import ContextMenu = foundry.applications.ux.ContextMenu;

/**
 * Extend the basic ActorSheet
 */
export class LancerMechSheet extends LancerActorSheet<EntryType.MECH> {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["lancer", "sheet", "actor", "mech"],
    position: { width: 900, height: 800 },
  });

  static override PARTS = {
    body: { template: "systems/lancer/templates/actor/mech.hbs" },
  };

  static override TABS = {
    primary: {
      initial: "stats",
      tabs: [
        { id: "stats", group: "primary" },
        { id: "loadout", group: "primary" },
        { id: "talents", group: "primary" },
        { id: "effects", group: "primary" },
      ],
    },
  };

  override activateListeners(html: HTMLElement): void {
    super.activateListeners(html);

    if (!this.isEditable) return;

    const $html = $(this.element);
    this._activateOverchargeControls($html);
    this._activateLoadoutControls($html);
    this._activateMountContextMenus($html);
  }

  /* -------------------------------------------- */

  canRootDrop(item: ResolvedDropData): boolean {
    // Reject any non npc / non pilot item
    if (item.type == "Actor" && item.document.is_pilot()) {
      // For setting pilot
      return true;
    } else if (item.type === "Item") {
      return (
        item.document.is_mech_system() ||
        item.document.is_mech_weapon() ||
        item.document.is_frame() ||
        item.document.is_status()
      );
    } else {
      return false;
    }
  }

  async onRootDrop(base_drop: ResolvedDropData, event: JQuery.DropEvent, _dest: JQuery<HTMLElement>): Promise<void> {
    // Take posession
    let [drop, is_new] = await this.quickOwnDrop(base_drop);

    if (drop.type == "Item" && drop.document.is_frame() && this.actor.is_mech()) {
      // Find and delete the old frame item, if it exists
      const oldFrame = this.actor.items.find(i => i.is_frame() && i.id != drop.document.id);
      if (oldFrame) {
        await this.actor.deleteEmbeddedDocuments("Item", [oldFrame.id!]);
      }
      // If new frame, auto swap with prior frame
      await this.actor.swapFrameImage(drop.document);
      await this.actor.updateTokenSize(drop.document);
      await this.actor.update({
        "system.loadout.frame": drop.document.id,
      });
      await this.actor.loadoutHelper.resetMounts();
    } else if (is_new && drop.type == "Item" && drop.document.is_mech_weapon()) {
      // If frame, weapon, put it in first available slot. Who cares if it fits
      let currMounts: SourceData.Mech["loadout"]["weapon_mounts"] = foundry.utils.duplicate(
        this.actor.system._source.loadout.weapon_mounts
      );
      let set = false;
      for (let mount of currMounts) {
        if (set) break;
        for (let i = 0; i < mount.slots.length; i++) {
          if (!mount.slots[i].weapon) {
            mount.slots[i].weapon = drop.document.id;
            set = true;
            break;
          }
        }
      }
      await this.actor.update({
        "system.loadout.weapon_mounts": currMounts,
      });
    } else if (is_new && drop.type == "Item" && drop.document.is_mech_system()) {
      let oldSystems: string[] = (this.actor as any).system._source.loadout.systems;
      await this.actor.update({
        "system.loadout.systems": [...oldSystems, drop.document.id],
      });
    } else if (drop.type == "Actor" && drop.document.is_pilot()) {
      await this.actor.update({
        "system.pilot": drop.document.uuid,
      });
      await drop.document.update({
        "system.active_mech": this.actor.uuid,
      });
    }

    // If this isn't a new item and it's an NPC feature, we need to update the sorting
    if (this.isEditable && !is_new && drop.type === "Item" && drop.document.is_mech_system()) {
      this._onSortItem(event, drop.document.toObject());
    }
  }

  /**
   * Handles actions in the overcharge panel
   */
  _activateOverchargeControls(html: JQuery<HTMLElement>) {
    html.off("click.lancerOverchargeControls");
    html.on("click.lancerOverchargeControls", ".overcharge-text", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!this.actor.is_mech()) return;
      this._setOverchargeLevel(ev, Math.min(this.actor.system.overcharge + 1, 3));
    });
    html.on("click.lancerOverchargeControls", ".overcharge-reset", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!this.actor.is_mech()) return;
      this._setOverchargeLevel(ev, 0);
    });
  }

  /**
   * Sets the overcharge level for this actor
   * @param event An event, used by a proper overcharge section in the sheet, to get the overcharge field
   * @param level Level to set overcharge to
   */
  async _setOverchargeLevel(_event: JQuery.ClickEvent, level: number) {
    let a = this.actor as LancerMECH;
    return a.update({
      "system.overcharge": level,
    });
  }

  /**
   * Handles more niche controls in the loadout in the overcharge panel
   */
  _activateLoadoutControls(html: any) {
    html.find(".reset-weapon-mount-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-wep", evt);
    });

    html.find(".reset-all-weapon-mounts-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-all-weapon-mounts", evt);
    });

    html.find(".reset-system-mount-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-sys", evt);
    });
  }

  // Allows user to change mount size via right click ctx
  _activateMountContextMenus(html: JQuery<HTMLElement>) {
    const mount_options: ContextMenu.Entry<HTMLElement>[] = [];

    // Handle generic mount type
    for (let selection of Object.values(MountType)) {
      mount_options.push({
        name: selection,
        icon: "",
        callback: async (target: HTMLElement) => {
          let mountPath = target.dataset.path ?? "";

          // Get the current mount
          let mount = resolveDotpath(this.actor, mountPath) as Actor.OfType<"mech">["loadout"]["weapon_mounts"][0];
          if (!mount) {
            console.error("Bad mountpath:", mountPath);
          }

          // Construct our new slots based on old slots
          let newSlots: SourceData.Mech["loadout"]["weapon_mounts"][0]["slots"] = [];
          let newSlotTypes = fittingsForMount(selection);
          newSlots = newSlots.splice(newSlotTypes.length); // Cut off everything past this end
          for (let i = 0; i < newSlotTypes.length; i++) {
            if (mount.slots[i]?.weapon?.value) {
              newSlots.push({
                mod: mount.slots[i].mod?.value?.id ?? null,
                size: newSlotTypes[i],
                weapon: mount.slots[i].weapon?.value?.id ?? null,
              });
            } else {
              newSlots.push({
                mod: null,
                size: newSlotTypes[i],
                weapon: null,
              });
            }
          }

          // Put the edits
          this.actor.update({
            [mountPath + ".type"]: selection,
            [mountPath + ".bracing"]: false,
            [mountPath + ".slots"]: newSlots,
          });
        },
      });
    }

    // Add a bracing option
    mount_options.push({
      name: "Superheavy Bracing",
      icon: "",
      callback: async (target: HTMLElement) => {
        let mountPath = target.dataset.path ?? "";

        // Get the current mount
        let mount = resolveDotpath(this.actor, mountPath) as Actor.OfType<"mech">["loadout"]["weapon_mounts"][0];
        if (!mount) {
          console.error("Bad mountpath:", mountPath);
        }

        // Set as bracing
        this.actor.update({
          [mountPath + ".type"]: MountType.Unknown,
          [mountPath + ".bracing"]: true,
          [mountPath + ".slots"]: [],
        });
      },
    });

    const root = html[0];
    if (root) {
      new ContextMenu.implementation(root, ".mount-type-ctx-root", mount_options, { jQuery: false });
    }
  }

  // Save ourselves repeat work by handling most events clicks actual operations here
  async _event_handler(
    mode: "reset-wep" | "reset-all-weapon-mounts" | "reset-sys" | "overcharge" | "overcharge-rollback",
    evt: JQuery.ClickEvent
  ) {
    evt.stopPropagation();
    let mech = this.actor as LancerMECH;
    let path = evt.currentTarget?.dataset?.path;

    switch (mode) {
      case "reset-all-weapon-mounts":
        await this.actor.loadoutHelper.resetMounts();
        break;
      case "reset-sys":
        this.actor.update({ "system.loadout.systems": [] });
        break;
      case "reset-wep":
        break;
      default:
        return; // no-op
    }
  }

  protected override async _prepareContext(
    options: Partial<foundry.applications.types.ApplicationRenderOptions>
  ): Promise<LancerActorSheetData<EntryType.MECH>> {
    const data = (await super._prepareContext(options)) as LancerActorSheetData<EntryType.MECH>;
    (data as Record<string, unknown>).pilot = this.actor.system.pilot?.value;
    (data as Record<string, unknown>).is_active =
      this.actor.system.pilot?.value?.system.active_mech?.value == this.actor;
    return data;
  }
}
