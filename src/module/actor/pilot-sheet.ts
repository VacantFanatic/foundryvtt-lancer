import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import type { LancerActorSheetData } from "../interfaces";
import { LancerActorSheet } from "./lancer-actor-sheet";
import type { HelperOptions } from "handlebars";
import { buildCounterHeader, buildCounterHTML } from "../helpers/item";
import { ref_params, resolve_ref_element } from "../helpers/refs";
import { inc_if, resolveDotpath } from "../helpers/commons";
import { LancerActor, type LancerMECH, type LancerPILOT } from "./lancer-actor";
import {
  fetchPilotViaCache,
  fetchPilotViaShareCode,
  fetchV2PilotViaShareCode,
  fetchV3PilotViaShareCode,
  isCompconLoggedIn,
  pilotCache,
} from "../util/compcon";
import CompconLoginForm from "../helpers/compcon-login-form";
import type { LancerFRAME } from "../item/lancer-item";
import { clicker_num_input } from "../helpers/actor";
import type { ResolvedDropData } from "../helpers/dragdrop";
import { EntryType } from "../enums";
import type { PackedPilotData } from "../util/unpacking/packed-types";
import { importCC, showImportResultDialog } from "./import";

const shareCodeMatcherV2 = /^[A-Z0-9]{6}$/;
const shareCodeMatcherV3 = /^[A-Z0-9]{12}$/;
const COUNTER_MAX = 8;

function normalizeCloudImportId(cloudId: string): string {
  const trimmed = cloudId.trim();
  const upper = trimmed.toUpperCase();
  if (shareCodeMatcherV3.test(upper) || shareCodeMatcherV2.test(upper)) {
    return upper;
  }
  return trimmed;
}

/**
 * Extend the basic ActorSheet
 */
function cloudImportError(prefix: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return detail ? `${prefix} ${detail}` : prefix;
}

export class LancerPilotSheet extends LancerActorSheet<EntryType.PILOT> {
  private _cloudDownloadInFlight = false;

  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["lancer", "sheet", "actor", "pilot"],
    position: { width: 900, height: 800 },
  });

  static override PARTS = {
    body: { template: "systems/lancer/templates/actor/pilot.hbs" },
  };

  static override TABS = {
    primary: {
      initial: "tactical",
      tabs: [
        { id: "cloud", group: "primary" },
        { id: "dossier", group: "primary" },
        { id: "narrative", group: "primary" },
        { id: "tactical", group: "primary" },
        { id: "loadout", group: "primary" },
        { id: "effects", group: "primary" },
      ],
    },
  };

  protected override _bindActorSheetListenersFromRender(): void {
    super._bindActorSheetListenersFromRender();
    if (!this.isEditable || !this.actor.isOwner) return;

    const root = this._coerceRootElement(this.element) ?? this._coerceRootElement(this.form);
    if (!root) return;
    const $el = $(root);
    const pilot = this.actor as LancerPILOT;

    $el
      .find('select[name="selectCloudId"]')
      .off("change.lancerCloudSelect")
      .on("change.lancerCloudSelect", evt => {
        evt.stopPropagation();
        pilot.update({ "system.cloud_id": (evt.target as HTMLSelectElement).value });
      });

    const download = $el.find('.cloud-control[data-action*="download"]');
    const status = $el.find(".cloud-download-status");
    const setCloudDownloading = (downloading: boolean) => {
      this._cloudDownloadInFlight = downloading;
      download.toggleClass("disabled-cloud cloud-downloading", downloading);
      download.attr("aria-busy", downloading ? "true" : "false");
      download.find(".cloud-download-idle").prop("hidden", downloading);
      download.find(".cloud-download-spinner").prop("hidden", !downloading);
      if (downloading) {
        status.text(game.i18n.localize("lancer.pilot-sheet.cloud-download.syncing"));
      }
    };
    if (!this._cloudDownloadInFlight) {
      download.removeClass("disabled-cloud cloud-downloading");
    }
    download.off("click.lancerCloudDownload").on("click.lancerCloudDownload", async ev => {
      ev.stopPropagation();
      if (this._cloudDownloadInFlight) return;

      let raw_pilot_data: PackedPilotData | null = null;
      const cloudId = normalizeCloudImportId(pilot.system.cloud_id ?? "");
      if (!cloudId) {
        ui.notifications!.error(
          "Could not find character to import! No pilot selected via dropdown and no share code entered."
        );
        return;
      }

      const lastSyncText = status.text();
      setCloudDownloading(true);
      try {
        if (shareCodeMatcherV3.test(cloudId)) {
          ui.notifications!.info("Importing character from V3 share code...");
          try {
            raw_pilot_data = await fetchV3PilotViaShareCode(cloudId);
          } catch (error) {
            ui.notifications!.error(cloudImportError("Error importing from V3 share code.", error));
            console.error(`Failed import with V3 share code ${cloudId}, error:`, error);
            return;
          }
        } else if (shareCodeMatcherV2.test(cloudId)) {
          ui.notifications!.info("Importing character from V2 share code...");
          try {
            raw_pilot_data = await fetchV2PilotViaShareCode(cloudId);
          } catch (error) {
            ui.notifications!.error(
              cloudImportError("Error importing from V2 share code. Share code may need to be refreshed.", error)
            );
            console.error(`Failed import with V2 share code ${cloudId}, error:`, error);
            return;
          }
        } else {
          const cachedPilot = pilotCache().find(p => p.cloudID == cloudId);
          if (cachedPilot != undefined) {
            ui.notifications!.info("Importing character from COMP/CON account...");
            try {
              raw_pilot_data = await fetchPilotViaCache(cachedPilot);
            } catch (error) {
              ui.notifications!.error(
                cloudImportError(
                  "Failed to import from COMP/CON account. Try refreshing the page to reload pilot list.",
                  error
                )
              );
              console.error(`Failed to import vaultID ${cloudId} via pilot list, error:`, error);
              return;
            }
          } else {
            ui.notifications!.info("Importing character from share code...");
            try {
              raw_pilot_data = await fetchPilotViaShareCode(cloudId);
            } catch (error) {
              ui.notifications!.error(
                cloudImportError(
                  "Failed to import from COMP/CON. Check the share code, vault selection, or try JSON import.",
                  error
                )
              );
              console.error(`Failed import for cloud id ${cloudId}, error:`, error);
              return;
            }
          }
        }

        await importCC(this.actor as LancerPILOT, raw_pilot_data, true, "cloud");
        this.render();
      } catch (error) {
        ui.notifications!.error(cloudImportError("COMP/CON import failed.", error));
        console.error(`${lp} COMP/CON import failed for cloud id ${cloudId}:`, error);
      } finally {
        setCloudDownloading(false);
        if (!this._cloudDownloadInFlight) {
          status.text(lastSyncText);
        }
      }
    });

    $el
      .find('[data-action="compconLogin"]')
      .off("click.lancerCompconLogin")
      .on("click.lancerCompconLogin", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const app = new CompconLoginForm();
        app.addEventListener("close", () => this.render(), { once: true });
        await app.render(true);
      });

    $el
      .find('[data-action="startPilotImportTour"]')
      .off("click.lancerPilotImportTour")
      .on("click.lancerPilotImportTour", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const tour = game.tours.get(`${game.system.id}.pilot-import`);
        if (tour) await tour.start();
        else ui.notifications!.warn(game.i18n.localize("lancer.pilot-sheet.cloud-wizard.tour-missing"));
      });

    $el.find<HTMLInputElement>("input#pilot-json-import").on("change", ev => this._onPilotJsonUpload(ev));

    $el.find(".activate-mech").on("click", async ev => {
      ev.stopPropagation();
      const mech = (await resolve_ref_element(ev.currentTarget.parentElement!)) as LancerActor | null;

      if (!mech || !mech.is_mech()) return;

      this.activateMech(mech);
    });

    $el.find(".deactivate-mech").on("click", async ev => {
      ev.stopPropagation();

      this.deactivateMech();
    });
  }

  _onPilotJsonUpload(ev: JQuery.ChangeEvent<HTMLInputElement, undefined, HTMLInputElement, HTMLInputElement>) {
    const jsonFile = ev.target.files?.[0];
    if (!jsonFile) return;

    console.log(`${lp} Selected file changed`, jsonFile);
    const fr = new FileReader();
    fr.addEventListener("load", ev => {
      this._onPilotJsonParsed(ev.target?.result as string);
    });
    fr.readAsText(jsonFile);
  }

  async _onPilotJsonParsed(fileData: string | null) {
    if (!fileData) return;

    let parsed: PackedPilotData & { data?: PackedPilotData };
    try {
      parsed = JSON.parse(fileData) as PackedPilotData & { data?: PackedPilotData };
    } catch (error) {
      console.error(`${lp} Failed to parse pilot JSON:`, error);
      await showImportResultDialog({
        status: "failure",
        pilotName: this.actor.name,
        source: "json",
        message: game.i18n.localize("lancer.import.errors.invalid-json"),
      });
      return;
    }

    console.log(`${lp} Pilot Data of selected JSON:`, parsed);

    if (!parsed) return;
    const displayName = parsed.name ?? parsed.data?.name ?? "Pilot";

    try {
      await importCC(this.actor as LancerPILOT, parsed, true, "json");
      this.render();
    } catch (error) {
      console.error(`${lp} JSON pilot import failed:`, error);
      await showImportResultDialog({
        status: "failure",
        pilotName: displayName,
        source: "json",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  activateMech(mech: LancerMECH) {
    let pilot = this.actor as LancerPILOT;
    // Set active mech
    pilot.update({ "system.active_mech": mech.uuid });
    mech.update({ "system.pilot": pilot.uuid });
  }

  async deactivateMech() {
    // Unset active mech
    await this.actor.update({
      "system.active_mech": null,
    });
  }

  protected override async _prepareContext(
    options: Partial<foundry.applications.types.ApplicationRenderOptions>
  ): Promise<LancerActorSheetData<EntryType.PILOT>> {
    const data = (await super._prepareContext(options)) as LancerActorSheetData<EntryType.PILOT>;

    data.compConLoggedIn = await isCompconLoggedIn();
    data.compConPilotCount = pilotCache().length;
    data.compConPilotList = pilotCache()
      .sort((p1, p2) => {
        if (p1.callsign < p2.callsign) return -1;
        if (p1.callsign > p2.callsign) return 1;
        if (p1.name < p2.name) return -1;
        if (p1.name > p2.name) return 1;
        return 0;
      })
      .reduce(
        (acc, pilot) => {
          acc[`${pilot.callsign} // ${pilot.name}`] = pilot.cloudID;
          return acc;
        },
        {} as Record<string, string>
      );

    return data;
  }

  protected override _ensureDefaultTabsIfBlank(): void {
    const pilot = this.actor as LancerPILOT;
    const root = (this.form ?? this.element) as HTMLElement;
    if (pilot.system.last_cloud_update === "never" && !root.querySelector('.tab.active[data-group="primary"]')) {
      this.changeTab("cloud", "primary", { force: true });
      return;
    }
    super._ensureDefaultTabsIfBlank();
  }

  protected override _processFormData(
    event: SubmitEvent | null,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended
  ): object {
    const expanded = super._processFormData(event, form, formData) as Record<string, unknown>;
    if (
      this.actor.is_pilot() &&
      expanded["system.callsign"] &&
      this.actor.system.callsign !== expanded["system.callsign"]
    ) {
      expanded["prototypeToken.name"] = expanded["system.callsign"];
    }
    return expanded;
  }

  // Pilots can handle most stuff
  canRootDrop(item: ResolvedDropData): boolean {
    // Accept mechs, so as to change their pilot
    if (item.type === "Actor" && item.document.is_mech()) {
      return true;
    }

    // Accept pilot items
    if (
      item.type === "Item" &&
      (item.document.is_core_bonus() ||
        item.document.is_pilot_weapon() ||
        item.document.is_pilot_armor() ||
        item.document.is_pilot_gear() ||
        item.document.is_license() ||
        item.document.is_skill() ||
        item.document.is_talent() ||
        item.document.is_organization() ||
        item.document.is_reserve() ||
        item.document.is_bond() ||
        item.document.is_status())
    ) {
      return true;
    }

    // Reject anything else
    return false;
  }

  async onRootDrop(base_drop: ResolvedDropData, event: JQuery.DropEvent, _dest: JQuery<HTMLElement>): Promise<void> {
    if (!this.actor.is_pilot()) return; // Just for types really
    let pilot = this.actor as LancerPILOT;
    let loadout = pilot.system.loadout;
    let oldBonds = pilot.items.filter(i => i.is_bond());

    // Take posession
    let [drop, is_new] = await this.quickOwnDrop(base_drop);

    // Now, do sensible things with it
    if (drop.type == "Item") {
      // Handle all pilot item types
      if (drop.document.is_pilot_weapon()) {
        // If new weapon, try to equip to first empty slot / first post slot
        for (let i = 0; i < loadout.weapons.length || i <= 2; i++) {
          if (!loadout.weapons[i]) {
            await pilot.update({
              [`system.loadout.weapons.${i}`]: drop.document.id,
            });
            break;
          }
        }
      } else if (drop.document.is_pilot_gear()) {
        // If new gear, try to equip to first empty slot / first post slot
        for (let i = 0; i < loadout.gear.length || i <= 3; i++) {
          if (!loadout.gear[i]) {
            await pilot.update({
              [`system.loadout.gear.${i}`]: drop.document.id,
            });
            break;
          }
        }
      } else if (drop.document.is_pilot_armor()) {
        // If new armor, try to equip to first empty slot / first post slot
        for (let i = 0; i < loadout.armor.length || i <= 1; i++) {
          if (!loadout.armor[i]) {
            await pilot.update({
              [`system.loadout.armor.${i}`]: drop.document.id,
            });
            break;
          }
        }
      } else if ((is_new && drop.document.is_talent()) || drop.document.is_skill()) {
        // If new skill or talent, reset to level 1
        await drop.document.update({ "system.rank": 1 });
      } else if (is_new && drop.document.is_bond() && oldBonds.length > 0) {
        // Delete all other bond items
        for (let oldBond of oldBonds) {
          await pilot._safeDeleteDescendant("Item", [oldBond]);
        }
      }
    } else if (drop.type == "Actor" && drop.document.is_mech()) {
      this.activateMech(drop.document);
    }

    // TODO
    // If this isn't a new item and it's an NPC feature, we need to update the sorting
    // if (
    //   this.isEditable &&
    //   !is_new &&
    //   drop.type === "Item" &&
    //   (drop.document.is_pilot_gear() || drop.document.is_pilot_weapon() || drop.document.is_reserve())
    // ) {
    //   this._onSortItem(event, drop.document.toObject());
    // }
  }
}

export function pilotCounters(pilot: LancerPILOT, _options: HelperOptions): string {
  let counter_detail = "";

  let counter_arr = pilot.system.custom_counters;

  for (let i = 0; i < counter_arr.length; i++) {
    // Only allow deletion if the Pilot is the source
    const counter = counter_arr[i];
    if (counter.max != null) {
      if (counter.max <= COUNTER_MAX) {
        counter_detail = counter_detail.concat(
          buildCounterHTML(counter, `system.custom_counters.${i}`, { canDelete: true })
        );
      } else {
        counter_detail = counter_detail.concat(
          buildCounterHeader(counter, `system.custom_counters.${i}`, { canDelete: true }),
          clicker_num_input(`system.custom_counters.${i}.value`, _options),
          "</div>"
        );
      }
    }
  }

  return `
  <div class="card clipped double">
    <span class="lancer-header lancer-primary submajor" style="padding-right: 5px">
      <span>COUNTERS</span>
      <a class="gen-control fas fa-plus" data-action="append" data-path="system.custom_counters" data-action-value="(struct)counter"></a>
    </span>
    <div class="wraprow double">
      ${counter_detail}
    </div>
  </div>`;
}

export function allMechPreview(_options: HelperOptions): string {
  let active_mech: LancerMECH | null = _options.data.root.system.active_mech?.value;

  /// I still feel like this is pretty inefficient... but it's probably the best we can do for now
  let owned_mechs = (game?.actors?.filter(
    (mech: LancerActor) =>
      mech.is_mech() &&
      mech.system.pilot?.status == "resolved" &&
      mech.system.pilot.value.id === _options.data.root.actor.id
  ) ?? []) as unknown as LancerMECH[];
  let as_html = [];
  for (let m of owned_mechs) {
    as_html.push(mech_preview(m, m == active_mech, _options));
  }
  return as_html.join("");
}

export function mech_preview(mech: LancerMECH, active: boolean, _options: HelperOptions): string {
  // Generate commons
  let frame = mech.items.find(i => i.type === EntryType.FRAME) as LancerFRAME | undefined;
  let mfr = frame?.system.manufacturer;

  // Making ourselves easy templates for the preview in case we want to switch in the future
  let preview_stats_arr = [
    { title: "HP", icon: "mdi mdi-heart-outline", path: "system.hp.value" },
    { title: "HEAT", icon: "cci cci-heat", path: "system.heat.value" },
    { title: "EVASION", icon: "cci cci-evasion", path: "system.evasion" },
    { title: "ARMOR", icon: "mdi mdi-shield-outline", path: "system.armor" },
    { title: "STRUCTURE", icon: "cci cci-structure", path: "system.structure.value" },
    { title: "STRESS", icon: "cci cci-reactor", path: "system.stress.value" },
    { title: "E-DEF", icon: "cci cci-edef", path: "system.edef" },
    { title: "SPEED", icon: "mdi mdi-arrow-right-bold-hexagon-outline", path: "system.speed" },
    { title: "SAVE", icon: "cci cci-save", path: "system.save" },
    { title: "SENSORS", icon: "cci cci-sensor", path: "system.sensor_range" },
  ];

  let stats_html = ``;

  for (let i = 0; i < preview_stats_arr.length; i++) {
    const builder = preview_stats_arr[i];
    stats_html = stats_html.concat(`
    <div class="mech-preview-stat-wrapper">
      <i class="${builder.icon} i--4 i--dark"> </i>
      <span class="major">${builder.title}</span>
      <span class="major">${resolveDotpath(mech, builder.path, 0)}</span>
    </div>`);
  }

  let button = active
    ? `<a class="deactivate-mech"><i class="cci cci-deactivate"></i></a>`
    : `<a class="activate-mech"><i class="cci cci-activate"></i></a>`;

  return `
  <div class="mech-preview lancer-border-${active ? "primary" : "dark-gray"}">
    <div class="mech-preview-titlebar ref set click-open ${active ? "active" : "inactive"}" ${ref_params(mech)}>
      ${button}
      <span>${mech.name}${inc_if(" // ACTIVE", active)}  --  ${mfr} ${frame?.name}</span>
    </div>
    <img src="${mech.img}"/>
    ${stats_html}
  </div>`;
}
