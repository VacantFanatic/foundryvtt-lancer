import { LancerItem, type LancerItemType, type LancerLICENSE } from "./item/lancer-item";
import {
  LancerActor,
  type LancerActorType,
  type LancerDEPLOYABLE,
  type LancerMECH,
  type LancerPILOT,
} from "./actor/lancer-actor";
import { LancerActiveEffect } from "./effects/lancer-active-effect";
import type { CollapseRegistry } from "./helpers/collapse";

// ------------------------------------------------------
// |       SHEET DATA TYPES                             |
// ------------------------------------------------------

/** Render context for Lancer item sheets (Application V2 / DocumentSheetV2–based). */
export interface LancerItemSheetData<T extends LancerItemType> {
  document: LancerItem;
  item: LancerItem;
  editable: boolean;
  isEditable: boolean;
  /** Merged sheet classes for the outer wrapper (from options.classes). */
  cssClass?: string;
  // The license, if it could be recovered
  license: LancerLICENSE | null;
  system: Item.SystemOfType<T>;
  collapse: CollapseRegistry;
  deployables: Record<string, LancerDEPLOYABLE>;
  org_types?: { [key: string]: string }; // Organization types, only provided on org sheets
  status_types?: { [key: string]: string }; // Status types, only provided on status sheets
  [key: string]: unknown;
}

export type CachedCloudPilot = {
  id: string;
  name: string;
  callsign: string;
  cloudID: string;
  cloudOwnerID: string;
};

/** Render context for Lancer actor sheets (Application V2 / ActorSheetV2–based). */
export interface LancerActorSheetData<T extends LancerActorType> {
  document: LancerActor;
  actor: LancerActor;
  editable: boolean;
  isEditable: boolean;
  cssClass?: string;
  // Store active mech/pilot at the root level
  active_mech?: LancerMECH;
  pilot?: LancerPILOT;
  // Store cloud pilot cache and potential cloud ids at the root level (pilot sheet)
  compConPilotList?: Record<string, string>;
  compConLoggedIn?: boolean;
  compConPilotCount?: number;
  showSyncBanner?: boolean;
  cleanedOwnerID?: string;
  vaultID?: string;
  rawID?: string;
  effect_categories: ReturnType<(typeof LancerActiveEffect)["prepareActiveEffectCategories"]>;
  system: Actor.SystemOfType<T>;
  itemTypes: LancerActor["itemTypes"];
  collapse: CollapseRegistry;
  deployables: Record<string, LancerDEPLOYABLE>;
  [key: string]: unknown;
}

export interface GenControlContext {
  // T is whatever is yielded by get_data/handled by commit_func
  // Raw information
  elt: HTMLElement; // The control element which fired this control event
  base_document: LancerActor | LancerItem; // The base document of this sheet
  path: string; // The data path stored on the control
  action: "delete" | "null" | "splice" | "set" | "append" | "insert"; // The action stored on the control
  raw_val?: string; // The unprocessed val stored on the control, if applicable

  // Deduced information
  path_target: null | any; // What path resolved to on data, if anything
  target_document: LancerActor | LancerItem; // The last document we were able to resolve on the path. Will be the target of our update
  relative_path: string; // Our update path relative to document
  parsed_val?: any; // Parsed version of raw_val
}
