import { EntryType } from "../enums";
import { fromLidMany } from "../helpers/from-lid";
import type { LancerItemSheetData } from "../interfaces";
import { LancerItemSheet } from "./item-sheet";

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerFrameSheet extends LancerItemSheet<EntryType.FRAME> {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    { position: { width: 700, height: 750 } },
    { inplace: false }
  );

  // Handle the "delete" option of the mounts
  async _onChangeMount(event: any) {
    // Get the index
    const elt = $(event.currentTarget);
    const index = elt.prop("index");
    const value = elt.prop("value");
    if (value == "delete") {
      // If delete, then circumvent normal update to delete the mount
      event.stopPropagation();
      const data = this.item.system;

      // Splice it out
      let mounts = [...data.mounts];
      mounts.splice(index, 1);
      this.item.update({
        "system.mounts": mounts,
      });
    }
  }

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  override activateListeners(html: HTMLElement): void {
    super.activateListeners(html);

    if (!this.isEditable) return;

    $(html).find(".mount-selector").on("change", e => this._onChangeMount(e));
  }

  protected override async _prepareContext(
    options: Partial<foundry.applications.types.ApplicationRenderOptions>
  ): Promise<LancerItemSheetData<EntryType.FRAME>> {
    const data = await super._prepareContext(options);
    (data as Record<string, unknown>).coreDeployables = await fromLidMany(data.system.core_system.deployables);
    return data;
  }
}
