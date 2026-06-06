import type { LancerActor } from "../actor/lancer-actor";
import { EntryType } from "../enums";
import { LancerItem } from "../item/lancer-item";
import { setRefSlotValue } from "../helpers/refs";
import type { ResolvedDropData } from "../helpers/dragdrop";
import { get_pack_id } from "../util/doc";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface CompendiumSlotPickerItem {
  uuid: string;
  name: string;
  img: string;
}

interface CompendiumSlotPickerOptions {
  actor: LancerActor;
  acceptTypes: EntryType[];
  slotPath: string;
  preFinalizeDrop?: ((drop: ResolvedDropData) => Promise<ResolvedDropData>) | null;
  resolve: (item: LancerItem | null) => void;
}

export class CompendiumSlotPicker extends HandlebarsApplicationMixin(ApplicationV2) {
  #resolve: (item: LancerItem | null) => void;
  #settled = false;
  #items: CompendiumSlotPickerItem[] = [];

  constructor(options: CompendiumSlotPickerOptions) {
    super({
      actor: options.actor,
      acceptTypes: options.acceptTypes,
      slotPath: options.slotPath,
      preFinalizeDrop: options.preFinalizeDrop ?? null,
      resolve: options.resolve,
    } as Record<string, unknown>);
    this.#resolve = options.resolve;
  }

  static PARTS = {
    body: { template: "systems/lancer/templates/window/compendium-slot-picker.hbs" },
  };

  static DEFAULT_OPTIONS = {
    id: "lancer-compendium-slot-picker",
    position: { width: 420, height: 520 },
    classes: ["lancer", "compendium-slot-picker-app"],
    window: {
      resizable: true,
    },
  };

  get actor(): LancerActor {
    return (this.options as CompendiumSlotPickerOptions).actor;
  }

  get acceptTypes(): EntryType[] {
    return (this.options as CompendiumSlotPickerOptions).acceptTypes;
  }

  get slotPath(): string {
    return (this.options as CompendiumSlotPickerOptions).slotPath;
  }

  get preFinalizeDrop(): ((drop: ResolvedDropData) => Promise<ResolvedDropData>) | null {
    return (this.options as CompendiumSlotPickerOptions).preFinalizeDrop ?? null;
  }

  static async pick(
    actor: LancerActor,
    acceptTypes: EntryType[],
    slotPath: string,
    preFinalizeDrop?: ((drop: ResolvedDropData) => Promise<ResolvedDropData>) | null
  ): Promise<LancerItem | null> {
    return await new Promise(resolve => {
      const dlg = new CompendiumSlotPicker({
        actor,
        acceptTypes,
        slotPath,
        preFinalizeDrop: preFinalizeDrop ?? null,
        resolve,
      });
      void dlg.render(true);
    });
  }

  #finish(item: LancerItem | null): void {
    if (this.#settled) return;
    this.#settled = true;
    this.#resolve(item);
  }

  async _prepareContext(options: Record<string, unknown>): Promise<object> {
    const context = await super._prepareContext(options);
    this.#items = await this.#loadItems();
    const typeLabels = this.acceptTypes.map(t => game.i18n.localize(`TYPES.Item.${t}`)).join(", ");
    return foundry.utils.mergeObject(context, {
      items: this.#items,
      hint: game.i18n.format("lancer.ref-slot.picker-hint", { types: typeLabels }),
      window: {
        title: game.i18n.localize("lancer.ref-slot.picker-title"),
      },
    });
  }

  async #loadItems(): Promise<CompendiumSlotPickerItem[]> {
    const items: CompendiumSlotPickerItem[] = [];
    const seen = new Set<string>();

    for (const type of this.acceptTypes) {
      const pack = game.packs.get(get_pack_id(type));
      if (!pack) continue;
      const docs = (await pack.getDocuments({ type })) as LancerItem[];
      for (const doc of docs) {
        if (seen.has(doc.uuid)) continue;
        seen.add(doc.uuid);
        items.push({
          uuid: doc.uuid,
          name: doc.name ?? doc.system?.name ?? doc.uuid,
          img: doc.img ?? "icons/svg/item-bag.svg",
        });
      }
    }

    return items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  _onRender(context: object, options: Record<string, unknown>) {
    super._onRender(context, options);
    const html = $(this.element);
    const filter = html.find(".compendium-slot-picker-filter");
    const list = html.find(".compendium-slot-picker-list");

    filter.on("input", () => {
      const query = (filter.val() as string).trim().toLowerCase();
      list.find(".compendium-slot-picker-item").each((_, el) => {
        const name = el.querySelector("span")?.textContent?.toLowerCase() ?? "";
        el.toggle(!query || name.includes(query));
      });
    });

    list.find(".compendium-slot-picker-item").on("click", async ev => {
      ev.preventDefault();
      const uuid = (ev.currentTarget as HTMLElement).dataset.uuid;
      if (!uuid) return;
      const doc = await fromUuid(uuid);
      if (!(doc instanceof LancerItem)) return;

      let drop: ResolvedDropData = { type: "Item", document: doc };
      if (this.preFinalizeDrop) {
        drop = await this.preFinalizeDrop(drop);
      }

      await setRefSlotValue(this.actor, this.slotPath, drop.document);
      this.#finish(drop.document);
      await this.close();
    });
  }

  async _onClose(options: Record<string, unknown>): Promise<void> {
    this.#finish(null);
    return super._onClose(options);
  }
}
