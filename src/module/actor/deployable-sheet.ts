import { LancerActorSheet } from "./lancer-actor-sheet";
import type { ResolvedDropData } from "../helpers/dragdrop";
import { EntryType } from "../enums";

/**
 * Extend the basic ActorSheet
 */
export class LancerDeployableSheet extends LancerActorSheet<EntryType.DEPLOYABLE> {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["lancer", "sheet", "actor", "deployable"],
    position: { width: 800, height: 800 },
  });

  static override PARTS = {
    body: { template: "systems/lancer/templates/actor/deployable.hbs" },
  };

  static override TABS = {
    primary: {
      initial: "status",
      tabs: [
        { id: "status", group: "primary" },
        { id: "config", group: "primary" },
        { id: "effects", group: "primary" },
      ],
    },
  };

  // Need to allow this stuff for setting deployable
  canRootDrop(item: ResolvedDropData): boolean {
    // Accept actors
    return (
      (item.type === "Actor" &&
        [EntryType.PILOT, EntryType.MECH, EntryType.NPC].includes(item.document.type as EntryType)) ||
      (item.type === "Item" && item.document.is_status())
    );
  }

  async onRootDrop(
    drop: ResolvedDropData,
    _event: JQuery.DropEvent<any, any, any, any>,
    _dest: JQuery<HTMLElement>
  ): Promise<void> {
    if (drop.type == "Actor" && drop.document != this.actor) {
      this.actor.update({ "system.owner": drop.document.uuid });
    }
  }

  /* -------------------------------------------- */

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  override activateListeners(html: HTMLElement): void {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Add or Remove options
    // Yes, theoretically this could be abstracted out to one function. You do it then.
  }
}
