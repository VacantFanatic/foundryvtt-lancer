import type { LancerItemSheetData } from "../interfaces";
import { LANCER } from "../config";
import type { LancerItem, LancerItemType } from "./lancer-item";
import { handleGenControls, handlePopoutTextEditor } from "../helpers/commons";
import { handleCounterInteraction, handleInputPlusMinusButtons } from "../helpers/item";
import {
  handleRefDragging,
  handleRefSlotDropping,
  handleDocListDropping,
  click_evt_open_ref,
  handleUsesInteraction,
  handleLIDListDropping,
} from "../helpers/refs";
import { handleContextMenus } from "../helpers/item";
import { applyCollapseListeners, CollapseHandler, initializeCollapses } from "../helpers/collapse";
import { ActionEditDialog } from "../apps/action-editor";
import { findLicenseFor, get_pack_id } from "../util/doc";
import { lookupOwnedDeployables } from "../util/lid";
import { EntryType, StatusConditionType } from "../enums";
import type { LancerDEPLOYABLE } from "../actor/lancer-actor";
import { BonusEditDialog } from "../apps/bonus-editor";
import { OrgType } from "../enums";
import { handleTagEditButtons } from "../helpers/tags";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const sheets = foundry.applications.sheets as typeof foundry.applications.sheets & {
  ItemSheetV2?: typeof foundry.applications.sheets.DocumentSheetV2;
};
const ItemSheetV2Base =
  "ItemSheetV2" in sheets && sheets.ItemSheetV2
    ? sheets.ItemSheetV2
    : foundry.applications.sheets.DocumentSheetV2;

const lp = LANCER.log_prefix;

/**
 * Lancer item sheet (Application V2).
 */
export class LancerItemSheet<T extends LancerItemType> extends HandlebarsApplicationMixin(ItemSheetV2Base) {
  declare document: LancerItem;

  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    (ItemSheetV2Base as { DEFAULT_OPTIONS?: object }).DEFAULT_OPTIONS ?? {},
    {
      classes: ["lancer", "sheet", "item"],
      tag: "form",
      position: { width: 700, height: 700 },
      window: { resizable: true },
      form: {
        closeOnSubmit: false,
        submitOnChange: true,
        handler: LancerItemSheet.#onSubmitForm,
      },
    },
    { inplace: false }
  );

  static override PARTS = {
    body: { template: "systems/lancer/templates/item/skill.hbs" },
  };

  constructor(
    arg0: LancerItem | (foundry.applications.types.ApplicationConfiguration & { document?: LancerItem }),
    arg1?: Partial<foundry.applications.types.ApplicationConfiguration>
  ) {
    // Avoid `instanceof foundry.documents.abstract.Document` — that symbol can be undefined in some runtimes
    // (throws "Right-hand side of 'instanceof' is not an object") and breaks item sheet construction.
    const first = arg0 as object | null;
    const opts: Record<string, unknown> =
      first !== null &&
      typeof first === "object" &&
      "document" in first &&
      (first as { document?: unknown }).document !== undefined
        ? { ...(first as Record<string, unknown>), ...(arg1 ?? {}) }
        : { document: arg0 as LancerItem, ...(arg1 ?? {}) };
    if (!opts.document) {
      throw new Error("LancerItemSheet requires a document");
    }
    const doc = opts.document as LancerItem;
    if (doc.is_mech_weapon()) {
      const idx = Number(doc.system.selected_profile_index ?? 0);
      opts.tabs = foundry.utils.mergeObject((opts.tabs as object) ?? {}, {
        initial: { primary: `profile${Number.isFinite(idx) ? idx : 0}` },
      });
    }
    super(opts as ConstructorParameters<typeof ItemSheetV2Base>[0]);
  }

  get item(): LancerItem {
    return this.document;
  }

  static async #onSubmitForm(
    this: LancerItemSheet<LancerItemType>,
    event: Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended
  ): Promise<void> {
    event.preventDefault();
    await this.item.update(formData.object);
  }

  protected collapse_handler = new CollapseHandler();

  protected override _configureRenderParts(options: Partial<foundry.applications.types.ApplicationRenderOptions>) {
    const parts = super._configureRenderParts(options) as Record<string, { template: string }>;
    parts.body = { template: `systems/lancer/templates/item/${this.item.type}.hbs` };
    return parts;
  }

  protected override _getTabsConfig(group: string): foundry.applications.types.ApplicationTabsConfiguration | null {
    if (group === "primary" && this.item.is_mech_weapon()) {
      const profiles = this.item.system.profiles ?? [];
      const idx = Number(this.item.system.selected_profile_index ?? 0);
      return {
        initial: `profile${Number.isFinite(idx) ? idx : 0}`,
        tabs: profiles.map((p: { name?: string }, i: number) => ({
          id: `profile${i}`,
          group: "primary",
          label: p.name ?? `<Profile ${i}>`,
        })),
      };
    }
    return super._getTabsConfig(group);
  }

  _activateContextListeners(html: JQuery) {
    handleContextMenus(html, this.item, !this.isEditable);
    handleTagEditButtons(html, this.item);
  }

  override activateListeners(html: HTMLElement): void {
    void html;
    super.activateListeners(this.element);
    const $html = $(this.element);

    initializeCollapses($html);
    applyCollapseListeners($html);

    $html.find(".ref.set.click-open").on("click", click_evt_open_ref);
    handleRefDragging($html);
    this._activateContextListeners($html);

    this._tabs?.forEach(t => t.bind(this.element));

    if (!this.isEditable) {
      return;
    }

    handleInputPlusMinusButtons($html, this.item);
    handleCounterInteraction($html, this.item);
    handleUsesInteraction($html, this.item);
    handleDocListDropping($html, this.item);
    handleLIDListDropping($html, this.item);
    handleRefSlotDropping($html, this.item, null);
    BonusEditDialog.handle($html, ".editable.bonus", this.item);
    ActionEditDialog.handle($html, ".action-editor", this.item);
    handlePopoutTextEditor($html, this.item);
    handleGenControls($html, this.item);
  }

  protected override async _prepareContext(
    options: Partial<foundry.applications.types.ApplicationRenderOptions>
  ): Promise<LancerItemSheetData<T>> {
    const context = (await super._prepareContext(options)) as LancerItemSheetData<T>;
    context.item = this.item;
    context.system = this.item.system;
    context.collapse = {};

    context.deployables = {};
    if (!this.item.pack && this.item.actor) {
      context.deployables = lookupOwnedDeployables(this.item.actor);
    } else {
      const deps =
        (await game.packs.get(get_pack_id(EntryType.DEPLOYABLE))?.getDocuments({ type: EntryType.DEPLOYABLE })) ?? [];
      for (const d of deps as LancerDEPLOYABLE[]) {
        context.deployables[d.system.lid] = d;
      }
    }

    context.license = null;
    if (this.actor?.is_pilot() || this.actor?.is_mech()) {
      context.license = await findLicenseFor(this.item, this.actor!);
    } else {
      context.license = await findLicenseFor(this.item);
    }

    if (this.item.is_organization()) {
      context.org_types = OrgType;
    }

    if (this.item.is_status()) {
      context.status_types = StatusConditionType;
      if (!context.system.lid) {
        context.system.lid = `status-${context.document.id}`;
      }
    }

    console.log(`${lp} Rendering with following item ctx: `, context);
    return context;
  }
}
