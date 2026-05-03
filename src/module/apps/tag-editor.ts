import { LANCER } from "../config";
import type { TagData, TagTemplateData } from "../models/bits/tag";
import { TargetedEditForm } from "./targeted-form-editor";

/**
 * A helper FormApplication subclass for editing a tag
 * @extends {FormApplication}
 */
export class TagEditForm extends TargetedEditForm<TagData> {
  static PARTS = {
    form: { template: "systems/lancer/templates/window/tag.hbs" },
  };

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["lancer", "tag-editor"],
    window: { title: "Tag Editing" },
  });

  async _prepareContext(options: Record<string, unknown>) {
    let tc = game.settings.get(game.system.id, LANCER.setting_tag_config) as Record<string, TagTemplateData>;
    let lid_options: { [key: string]: string } = {};
    Object.entries(tc).forEach(tag => (lid_options[tag[1].name] = tag[0]));
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      lid: (context as any).value.lid, // Compat thing for std-select
      lid_options,
    });
  }
}
