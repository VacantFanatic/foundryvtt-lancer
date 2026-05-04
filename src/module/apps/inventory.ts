import type { LancerActor } from "../actor/lancer-actor";
import { handleGenControls } from "../helpers/commons";
import { handleRefDragging, click_evt_open_ref } from "../helpers/refs";
import { handleContextMenus } from "../helpers/item";
import { applyCollapseListeners, initializeCollapses } from "../helpers/collapse";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface FilledCategory {
  label: string;
  items: any[];
}

export interface InventoryDialogData {
  content: string;
  categories: FilledCategory[];
}

/**
 * A helper Dialog subclass for editing an actors inventories
 * @extends {Dialog}
 */
export class InventoryDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options: { document: LancerActor; window?: { title?: string } }) {
    super(options);
  }

  static PARTS = {
    body: { template: "systems/lancer/templates/window/inventory.hbs" },
  };

  static DEFAULT_OPTIONS = {
    id: "lancer-inventory-editor",
    position: { width: 600, height: "auto" },
    classes: ["lancer", "inventory-editor"],
  };

  get actor(): LancerActor {
    return this.options.document as LancerActor;
  }

  async _prepareContext(options: Record<string, unknown>): Promise<object> {
    const context = await super._prepareContext(options);
    // Fill out our categories
    return foundry.utils.mergeObject(context, {
      categories: this.populate_categories(this.actor),
    });
  }

  _onRender(context: object, options: Record<string, unknown>) {
    super._onRender(context, options);
    // Register the active Application with the referenced Documents, to get updates
    this.actor.apps[this.appId] = this;

    const html = $(this.element);

    initializeCollapses(html);
    applyCollapseListeners(html);

    // Everything below here is only needed if the sheet is editable
    let getfunc = () => this.getData();
    let commitfunc = (_: any) => {};

    // Enable general controls, so items can be deleted and such
    handleGenControls(html, this.actor);

    // Enable ref dragging
    handleRefDragging(html);

    handleContextMenus(html, this.actor);

    // Make refs clickable to open the item
    html.find(".ref.set.click-open").on("click", click_evt_open_ref);
  }

  async _onClose(options: Record<string, unknown>): Promise<void> {
    delete this.actor.apps[this.appId];
    return super._onClose(options);
  }

  // Get the appropriate cats for the given actor
  populate_categories(actor: LancerActor): FilledCategory[] {
    // Decide categories based on type
    let cats: FilledCategory[] = [];
    if (actor.is_mech()) {
      cats = [
        {
          label: "Frames",
          items: actor.items.filter(i => i.is_frame()),
        },
        {
          label: "Weapons",
          items: actor.items.filter(i => i.is_mech_weapon()),
        },
        {
          label: "Systems",
          items: actor.items.filter(i => i.is_mech_system()),
        },
        {
          label: "Mods",
          items: actor.items.filter(i => i.is_weapon_mod()),
        },
        {
          label: "Statuses",
          items: actor.items.filter(i => i.is_status()),
        },
      ];
    } else if (actor.is_pilot()) {
      cats = [
        {
          label: "Weapons",
          items: actor.items.filter(i => i.is_pilot_weapon()),
        },
        {
          label: "Armor",
          items: actor.items.filter(i => i.is_pilot_armor()),
        },
        {
          label: "Gear",
          items: actor.items.filter(i => i.is_pilot_gear()),
        },
        {
          label: "Talents",
          items: actor.items.filter(i => i.is_talent()),
        },
        {
          label: "Skills",
          items: actor.items.filter(i => i.is_skill()),
        },
        {
          label: "Licenses",
          items: actor.items.filter(i => i.is_license()),
        },
        {
          label: "Core Bonuses",
          items: actor.items.filter(i => i.is_core_bonus()),
        },
        {
          label: "Reserves",
          items: actor.items.filter(i => i.is_reserve()),
        },
        {
          label: "Organizations",
          items: actor.items.filter(i => i.is_organization()),
        },
        {
          label: "Statuses",
          items: actor.items.filter(i => i.is_status()),
        },
      ];
    } else {
      console.warn("Cannot yet show inventory for " + actor.type);
    }
    return cats;
  }

  static async show_inventory(actor: LancerActor): Promise<void> {
    return new Promise((resolve, _reject) => {
      const dlg = new this({
        document: actor,
        window: { title: `${actor.name}'s inventory` },
      });
      dlg.addEventListener("close", () => resolve(), { once: true });
      dlg.render(true);
    });
  }
}
