import { LANCER } from "../config";
import { EntryType } from "../enums";
import type { LancerItemSheetData } from "../interfaces";
import { fromLid } from "../helpers/from-lid";
import { LancerItemSheet } from "./item-sheet";
import type { LancerItem, LancerNPC_CLASS, LancerNPC_TEMPLATE } from "./lancer-item";
const lp = LANCER.log_prefix;

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerNPCClassSheet extends LancerItemSheet<EntryType.NPC_CLASS | EntryType.NPC_TEMPLATE> {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    { position: { width: 900, height: 750 } },
    { inplace: false }
  );

  base_feature_items!: (LancerItem & { type: EntryType.NPC_FEATURE })[];
  optional_feature_items!: (LancerItem & { type: EntryType.NPC_FEATURE })[];

  protected override async _prepareContext(
    options: Partial<foundry.applications.types.ApplicationRenderOptions>
  ): Promise<LancerItemSheetData<EntryType.NPC_CLASS | EntryType.NPC_TEMPLATE>> {
    const data = await super._prepareContext(options);

    const item = this.item as LancerNPC_CLASS | LancerNPC_TEMPLATE;
    (data as Record<string, unknown>).base_features = await Promise.all(
      Array.from(item.system.base_features).map(lid => fromLid(lid))
    );
    (data as Record<string, unknown>).optional_features = await Promise.all(
      Array.from(item.system.optional_features).map(lid => fromLid(lid))
    );

    return data;
  }
}
