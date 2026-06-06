import { EntryType } from "../enums";
import { bindAsyncRefreshButton } from "../helpers/async-ui";
import { handleDocDropping } from "../helpers/dragdrop";
import { handleContextMenus } from "../helpers/item";
import type { LancerItemSheetData } from "../interfaces";
import { get_pack_id } from "../util/doc";
import { LancerItemSheet } from "./item-sheet";
import { LancerItem } from "./lancer-item";

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerLicenseSheet extends LancerItemSheet<EntryType.LICENSE> {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    { position: { width: 700, height: 750 } },
    { inplace: false }
  );

  protected override async _prepareContext(
    options: Partial<foundry.applications.types.ApplicationRenderOptions>
  ): Promise<LancerItemSheetData<EntryType.LICENSE>> {
    const data = await super._prepareContext(options);

    // Build an unlocks array
    let unlocks: LancerItem[][] = [[]];

    // Find the assoc frame
    for (let et of [EntryType.FRAME, EntryType.MECH_SYSTEM, EntryType.MECH_WEAPON, EntryType.WEAPON_MOD]) {
      let pack = game.packs.get(get_pack_id(et));
      if (pack) {
        let index = await pack.getIndex();
        let key = this.item.system.key;
        for (let [id, indexData] of index.entries()) {
          let itemLicense = indexData.system.license as string | undefined;
          if (itemLicense !== key) continue;

          let doc = (await pack.getDocument(id)) as unknown as LancerItem;
          let rank = doc.system.license_level as number;
          while (unlocks.length <= rank) {
            unlocks.push([]);
          }
          // Don't add duplicates
          if (unlocks[rank].some(i => i.id === doc.id)) continue;
          unlocks[rank].push(doc as LancerItem);
        }
      }
    }
    // Sort the items in the unlocks. Frames first, then alphabetical by name.
    for (let i = 0; i < unlocks.length; i++) {
      unlocks[i].sort((a, b) => {
        if (a.is_frame() && !b.is_frame()) return -1;
        if (!a.is_frame() && b.is_frame()) return 1;
        return a.name!.localeCompare(b.name!);
      });
    }

    (data as Record<string, unknown>)["unlocks"] = unlocks;

    return data;
  }

  /**
   * @override
   */
  _activateContextListeners(html: JQuery) {
    // Enable custom context menu triggers with only the "view" option.
    handleContextMenus(html, this.item, true);
  }

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html - The prepared HTML object ready to be rendered into the DOM
   */
  override activateListeners(html: HTMLElement): void {
    super.activateListeners(html);

    const $html = $(html);
    handleDocDropping($html, (doc, dest, evt) => {
      if (doc.type == "Item") {
        doc.document.update({
          system: {
            license: this.item.system.key,
            manufacturer: this.item.system.manufacturer,
          },
        });
      }
    });

    bindAsyncRefreshButton($html, '[data-action="refreshUnlocks"]', async () => {
      await this.render();
    });
  }
}
