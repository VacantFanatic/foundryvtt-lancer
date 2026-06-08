import type { ActionType } from "../action";
import { modAction } from "../action/action-tracker";
import { InventoryDialog } from "../apps/inventory";
import { LANCER } from "../config";
import { LancerActiveEffect } from "../effects/lancer-active-effect";
import { EntryType } from "../enums";
import { LancerFlowState } from "../flows/interfaces";
import { beginItemChatFlow } from "../flows/item";
import { CollapseHandler, applyCollapseListeners, initializeCollapses } from "../helpers/collapse";
import { handleGenControls, handlePopoutTextEditor } from "../helpers/commons";
import {
  DroppableFlowType,
  type LancerFlowDropData,
  type ResolvedDropData,
  handleDocDropping,
} from "../helpers/dragdrop";
// import { addExportButton } from "../helpers/io";
import {
  handleContextMenus,
  handleCounterInteraction,
  handleInputPlusMinusButtons,
  handlePowerUsesInteraction,
} from "../helpers/item";
import {
  handleChargedInteraction,
  handleLoadedInteraction,
  handleRefClickOpen,
  handleRefDragging,
  handleRefSlotDropping,
  handleRefSlotPicking,
  handleUsesInteraction,
} from "../helpers/refs";
import { LancerItem } from "../item/lancer-item";
import { normalizeCoreEnergyFormValue } from "../helpers/mech-combat-dock-core";
import { lookupOwnedDeployables } from "../util/lid";
import type { LancerActorSheetData } from "../interfaces";
import { LancerActor, type LancerActorType } from "./lancer-actor";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
type HeaderControlsEntry = foundry.applications.api.ApplicationV2.HeaderControlsEntry;
const lp = LANCER.log_prefix;

/**
 * Lancer actor sheet base (Application V2).
 */
export class LancerActorSheet<T extends LancerActorType> extends HandlebarsApplicationMixin(ActorSheetV2) {
  declare document: LancerActor;

  /** Stable dragstart handler so listeners can be rebound each render without stacking. */
  private readonly _flowDragStartHandler = (e: DragEvent) => {
    this._onFlowButtonDragStart(e);
  };

  // Tracks collapse state between renders
  protected collapse_handler = new CollapseHandler();

  /** Allow detached instances to render with a unique application id. */
  get id(): string {
    const detachedKey = (this.options as { detachedKey?: string })?.detachedKey;
    if (!detachedKey) return super.id;
    return `${super.id}-${detachedKey}`;
  }

  get actor(): LancerActor {
    return this.document;
  }

  /**
   * Foundry can accumulate duplicate header control entries (e.g. repeated overflow actions)
   * when Application options merge across the inheritance chain. De-duplicate by stable key.
   */
  protected override _getHeaderControls(): HeaderControlsEntry[] {
    const controls = super._getHeaderControls();
    const seen = new Set<string>();
    const out: HeaderControlsEntry[] = [];
    for (const c of controls) {
      const key = c.action ? String(c.action) : `${c.label}:${c.icon}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }

  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    (ActorSheetV2 as { DEFAULT_OPTIONS?: object }).DEFAULT_OPTIONS ?? {},
    {
      tag: "form",
      scrollY: [".scroll-body"],
      window: {
        resizable: true,
      },
      form: {
        closeOnSubmit: false,
        submitOnChange: true,
        handler: LancerActorSheet.#onSubmitForm,
      },
    },
    { inplace: false }
  );

  static async #onSubmitForm(
    this: LancerActorSheet<LancerActorType>,
    event: Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended
  ): Promise<void> {
    event.preventDefault();
    const updateData = { ...formData.object };
    if ("system.core_energy" in updateData) {
      updateData["system.core_energy"] = normalizeCoreEnergyFormValue(updateData["system.core_energy"]);
    }
    this._propagateData(updateData);
    await this.actor.update(updateData);
  }

  protected override _onRender(context: object, options: Record<string, unknown>): void {
    super._onRender(context, options);
    this._ensureDefaultTabsIfBlank();
    this._bindActorSheetListenersFromRender();
  }

  protected _coerceRootElement(value: unknown): HTMLElement | null {
    if (value instanceof HTMLElement) return value;
    if (value && typeof value === "object") {
      const maybe = value as { 0?: unknown; element?: unknown };
      if (maybe[0] instanceof HTMLElement) return maybe[0];
      if (maybe.element instanceof HTMLElement) return maybe.element;
      if (maybe.element && typeof maybe.element === "object") {
        const nested = maybe.element as { 0?: unknown };
        if (nested[0] instanceof HTMLElement) return nested[0];
      }
    }
    return null;
  }

  protected _bindActorSheetListenersFromRender(): void {
    const root = this._coerceRootElement(this.element) ?? this._coerceRootElement(this.form);
    if (!root) return;
    const $el = $(root);

    initializeCollapses($el);
    applyCollapseListeners($el);
    this._activateActionGridListeners($el);
    handleRefClickOpen($el);
    handleRefDragging($el);
    this._tabs?.forEach(t => t.bind(this.element));
    this._activateFlowListeners($el);
    this._activateFlowDragging($el);

    if (!this.isEditable) return;

    handleInputPlusMinusButtons($el, this.actor);
    handleCounterInteraction($el, this.actor);
    handleUsesInteraction($el, this.actor);
    handleLoadedInteraction($el, this.actor);
    handleChargedInteraction($el, this.actor);
    handlePowerUsesInteraction($el, this.actor);
    handleContextMenus($el, this.actor);
    this._activateInventoryButton($el);
    const preFinalizeDrop = (x: ResolvedDropData) => this.quickOwnDrop(x).then(v => v[0]);
    handleRefSlotDropping($el, this.actor, preFinalizeDrop);
    handleRefSlotPicking($el, this.actor, preFinalizeDrop);
    handleGenControls($el, this.actor);
    handlePopoutTextEditor($el, this.actor);
    handleDocDropping(
      $el,
      async (entry, _dest, _event) => this.onRootDrop(entry, _event, _dest),
      (entry, _dest, _event) => this.canRootDrop(entry)
    );
  }

  /**
   * If no content panel has `.active` for a tab group, activate `static TABS[group].initial`.
   * Prevents a blank sheet body when tab state desyncs after migration or re-render.
   */
  protected _ensureDefaultTabsIfBlank(): void {
    const ctor = this.constructor as unknown as {
      TABS?: Record<string, { initial?: string }>;
    };
    const tabsCfg = ctor.TABS;
    if (!tabsCfg) return;

    const root = (this.form ?? this.element) as HTMLElement;
    for (const [groupId, conf] of Object.entries(tabsCfg)) {
      const initial = conf?.initial;
      if (!initial) continue;
      if (root.querySelector(`.tab.active[data-group="${groupId}"]`)) continue;
      this.changeTab(initial, groupId, { force: true });
    }
  }

  protected _onDetachSheet(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this._detachSheet();
  }

  protected _triggerNativeDetach(): boolean {
    const header = $(this.element).find(".window-header");
    if (!header.length) return false;
    const popoutWords = ["popout", "detach", "new window"];
    const nativeControl = header
      .find('a,button,[role="button"]')
      .toArray()
      .filter(el => !el.matches('[data-action="lancer-sheet-controls"]'))
      .find(el => {
        const action = (el.dataset?.action ?? "").toLowerCase();
        if (["popout", "detach", "window-popout", "toggle-popout"].includes(action)) return true;
        const classes = Array.from(el.classList).join(" ").toLowerCase();
        if (classes.includes("popout") || classes.includes("detach")) return true;
        const hay = `${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("title") ?? ""} ${
          el.getAttribute("data-tooltip") ?? ""
        } ${el.textContent ?? ""}`.toLowerCase();
        return popoutWords.some(word => hay.includes(word));
      });
    if (nativeControl) {
      nativeControl.click();
      return true;
    }
    return false;
  }

  protected _detachSheet(): void {
    const nativePopout = (this as any)._onPopout;
    if (typeof nativePopout === "function") {
      nativePopout.call(this, new MouseEvent("click"));
      return;
    }
    if (this._triggerNativeDetach()) return;
    ui.notifications?.error("Unable to detach Application. You may have a pop-up blocker active.");
  }

  /** Open the actor portrait using Foundry's in-app ImagePopout viewer (V13+). */
  protected _viewPortrait(): void {
    const src = this.actor?.img;
    if (!src) return;
    const ImagePopoutCls = (foundry as any).applications?.apps?.ImagePopout ?? (globalThis as any).ImagePopout;
    if (!ImagePopoutCls) return;
    try {
      new ImagePopoutCls({
        src,
        uuid: this.actor.uuid,
        window: { title: this.actor.name ?? "" },
      }).render(true);
    } catch (_err) {
      new ImagePopoutCls(src, { title: this.actor.name }).render(true);
    }
  }

  /** Find the existing native "Sheet" header control element, if rendered. */
  protected _findHeaderSheetControl(header: JQuery): HTMLElement | null {
    const candidates = header
      .find('a,button,[role="button"]')
      .toArray()
      .filter(el => !el.matches('[data-action="lancer-sheet-controls"]'));
    const isSheetEl = (el: HTMLElement): boolean => {
      const action = (el.dataset?.action ?? "").toLowerCase();
      if (action === "sheet" || action === "configuresheet") return true;
      if (el.classList.contains("configure-sheet") || el.classList.contains("sheet")) return true;
      const aria = (el.getAttribute("aria-label") ?? "").trim().toLowerCase();
      const tip = (el.getAttribute("data-tooltip") ?? "").trim().toLowerCase();
      const txt = (el.textContent ?? "").trim().toLowerCase();
      const sheetLabel = (game.i18n.localize("SHEETS.Sheet") || "Sheet").trim().toLowerCase();
      const sheetWord = "sheet";
      const hay = `${aria} | ${tip} | ${txt}`;
      if (aria === sheetLabel || aria === sheetWord) return true;
      if (tip === sheetLabel || tip === sheetWord) return true;
      if (txt === sheetLabel || txt === sheetWord) return true;
      if (hay.includes(`configure ${sheetWord}`)) return true;
      return false;
    };
    return candidates.find(isSheetEl) ?? null;
  }

  /** Add a direct header detach control for actor sheets. */
  protected _injectHeaderDetachControl(): void {
    const app = $(this.element);
    if (!app.length) return;
    const header = app.find(".window-header");
    if (!header.length || header.find('[data-action="lancer-sheet-detach-direct"]').length) return;
    const findHeaderControl = (predicate: (el: HTMLElement) => boolean): HTMLElement | null =>
      header
        .find('a,button,[role="button"]')
        .toArray()
        .filter(el => !el.matches('[data-action="lancer-sheet-detach-direct"]'))
        .find(predicate) ?? null;
    const sheetControl = findHeaderControl(el => {
      const action = (el.dataset?.action ?? "").toLowerCase();
      if (action === "sheet" || action === "configuresheet") return true;
      return el.classList.contains("configure-sheet");
    });
    const detachControl = $(
      `<a class="header-control" data-action="lancer-sheet-detach-direct" data-tooltip="${game.i18n.localize(
        "lancer.ActorSheet.Detach"
      )}" aria-label="${game.i18n.localize("lancer.ActorSheet.Detach")}">
        <i class="fas fa-up-right-from-square"></i>
      </a>`
    );
    detachControl.on("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      this._detachSheet();
    });
    const sheetAnchor = sheetControl ?? this._findHeaderSheetControl(header);
    if (sheetAnchor) {
      sheetAnchor.before(detachControl[0]);
      return;
    }
    header.append(detachControl);
  }

  /* -------------------------------------------- */
  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  override activateListeners(html: HTMLElement): void {
    // Foundry core binds `data-action` / sheet chrome on the part root `html`.
    super.activateListeners(html);
    this._injectHeaderDetachControl();
    // Listener wiring is done in `_bindActorSheetListenersFromRender`, called from `_onRender`,
    // because runtime evidence showed `_onRender` fires reliably while `activateListeners`
    // may not in every host path.
  }

  _activateFlowDragging(html: JQuery) {
    const sel =
      ".lancer-flow-button, .roll-stat, .roll-attack, .roll-tech, .roll-damage, .chat-flow-button, .skill-flow, .bond-power-flow, .effect-flow, .activation-flow";
    html.find(sel).each((_i, item) => {
      item.removeEventListener("dragstart", this._flowDragStartHandler);
      item.setAttribute("draggable", "true");
      item.addEventListener("dragstart", this._flowDragStartHandler, false);
    });
  }

  _onFlowButtonDragStart(e: DragEvent) {
    if (!e.currentTarget) return; // No target, let other handlers take care of it.
    e.stopPropagation();

    // TODO: can we consolidate this with the flow listeners somehow??
    // For now there's just going to be a lot of duplication.
    const dragElement = $(e.currentTarget);
    let data: LancerFlowDropData | null = null;
    if (dragElement.hasClass("lancer-flow-button")) {
      const flowElement = $(e.currentTarget).closest("[data-flow-type]")[0] as HTMLElement;
      const flowType: DroppableFlowType = DroppableFlowType.BASIC;
      const flowSubtype = flowElement.dataset.flowType;
      const flowArgs = JSON.parse(flowElement.dataset.flowArgs ?? "{}");
      if (flowSubtype) {
        data = {
          lancerType: this.actor.type as EntryType,
          uuid: this.actor.uuid,
          flowType,
          flowSubtype,
          args: flowArgs,
        };
      }
    } else if (dragElement.hasClass("roll-stat")) {
      const el = $(e.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const statPath = el.dataset.path;
      if (!statPath) throw Error("No stat path found!");
      data = {
        lancerType: this.actor.type as EntryType,
        uuid: this.actor.uuid,
        flowType: DroppableFlowType.STAT,
        args: { statPath },
      };
    } else if (dragElement.hasClass("roll-attack") || dragElement.hasClass("roll-damage")) {
      const weaponElement = $(e.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const weaponId = weaponElement.dataset.uuid;
      if (!weaponId) throw Error("No weapon ID found!");
      const weapon = LancerItem.fromUuidSync(weaponId, `Invalid weapon ID: ${weaponId}`);
      data = {
        lancerType: weapon.type as EntryType,
        uuid: weaponId,
        flowType: dragElement.hasClass("roll-attack") ? DroppableFlowType.ATTACK : DroppableFlowType.DAMAGE,
        args: {},
      };
    } else if (dragElement.hasClass("roll-tech")) {
      const techElement = $(e.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const techId = techElement.dataset.uuid;
      if (!techId) throw Error("No tech ID found!");
      const techItem = LancerItem.fromUuidSync(techId, `Invalid tech ID: ${techId}`);
      data = {
        lancerType: techItem.type as EntryType,
        uuid: techId,
        flowType: DroppableFlowType.TECH_ATTACK,
        args: {},
      };
    } else if (dragElement.hasClass("chat-flow-button")) {
      const el = $(e.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      if (!el || !el.dataset.uuid) throw Error(`No item UUID found!`);
      const item = LancerItem.fromUuidSync(el.dataset.uuid, `Invalid item ID: ${el.dataset.uuid}`);
      data = {
        lancerType: item.type as EntryType,
        uuid: el.dataset.uuid,
        flowType: DroppableFlowType.CHAT,
        args: { ...el.dataset },
      };
    } else if (dragElement.hasClass("skill-flow")) {
      const el = $(e.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const skillId = el.dataset.uuid;
      if (!skillId) throw Error("No skill ID found!");
      const skill = LancerItem.fromUuidSync(skillId, `Invalid skill ID: ${skillId}`);
      data = {
        lancerType: skill.type as EntryType,
        uuid: skillId,
        flowType: DroppableFlowType.SKILL,
        args: { skillId },
      };
    } else if (dragElement.hasClass("bond-power-flow")) {
      const powerElement = $(e.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const bondId = powerElement.dataset.uuid;
      if (!bondId) throw Error("No bond ID found!");
      const bond = LancerItem.fromUuidSync(bondId, `Invalid bond ID: ${bondId}`);
      const powerIndex = parseInt(powerElement.dataset.powerIndex ?? "-1");
      data = {
        lancerType: bond.type as EntryType,
        uuid: bondId,
        flowType: DroppableFlowType.BOND_POWER,
        args: { powerIndex },
      };
    } else if (dragElement.hasClass("effect-flow")) {
      const el = $(e.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const itemId = el.dataset.uuid;
      if (!itemId) throw Error("No item ID found!");
      const item = LancerItem.fromUuidSync(itemId, `Invalid item ID: ${itemId}`);
      data = {
        lancerType: item.type as EntryType,
        uuid: itemId,
        flowType: DroppableFlowType.EFFECT,
        args: {},
      };
    } else if (dragElement.hasClass("activation-flow")) {
      const el = $(e.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const itemId = el.dataset.uuid;
      const path = el.dataset.path;
      if (!itemId || !path) throw Error("No item ID from activation chip");
      let isDeployable = path.includes("deployable");
      let isAction = !isDeployable && path.includes("action");
      let isCoreSystem = !isDeployable && path.includes("core_system");
      const item = LancerItem.fromUuidSync(itemId, `Invalid item ID: ${itemId}`);
      if (isAction) {
        data = {
          lancerType: item.type as EntryType,
          uuid: itemId,
          flowType: DroppableFlowType.ACTIVATION,
          args: { path },
        };
      } else if (isCoreSystem) {
        data = {
          lancerType: item.type as EntryType,
          uuid: itemId,
          flowType: DroppableFlowType.CORE_ACTIVE,
          args: { path },
        };
      } else if (isDeployable) {
        // TODO - deployable actions
      } else {
        ui.notifications!.error("Could not infer action type");
        throw Error("Could not infer action type");
      }
    }
    if (!data) return;
    e.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  async _activateActionGridListeners(html: JQuery) {
    let elements = html.find(".lancer-action-button");
    elements.on("click", { capture: true }, async ev => {
      ev.stopPropagation();

      if (game.user?.isGM || game.settings.get(game.system.id, LANCER.setting_actionTracker).allowPlayers) {
        const params = ev.currentTarget.dataset;
        const action = params.action as ActionType | undefined;
        if (action && params.val) {
          let spend: boolean;
          if (params.action === "move") {
            spend = parseInt(params.val) > 0;
          } else {
            spend = params.val === "true";
          }
          modAction(this.actor as LancerActor, spend, action);
        }
      } else {
        ui.notifications?.warn(`${game.user?.name} cannot toggle actions via the action tracker.`, { localize: false });
      }
    });
  }

  _activateFlowListeners($root: JQuery) {
    $root.off(".lancerActorFlowUi");

    // Delegated: survives tab switches / partial HTML replacement under Application V2.
    // jQuery signature is .on(events, selector, data, handler); options like { capture: true } must not sit
    // where `selector` is expected or Sizzle tries to parse "[object Object]" and throws.
    $root.on("click.lancerActorFlowUi", ".lancer-flow-button", { capture: true }, ev => {
      if (!ev.currentTarget) return;
      ev.preventDefault();
      ev.stopPropagation();
      const flowElement = $(ev.currentTarget).closest("[data-flow-type]")[0] as HTMLElement;
      const flowType = flowElement.dataset.flowType;
      const flowArgs = JSON.parse(flowElement.dataset.flowArgs ?? "{}");
      const BasicFlowType = LancerFlowState.BasicFlowType;
      switch (flowType) {
        case BasicFlowType.FullRepair:
          this.actor.beginFullRepairFlow(flowArgs?.title ?? undefined);
          break;
        case BasicFlowType.Stabilize:
          this.actor.beginStabilizeFlow(flowArgs?.title ?? undefined);
          break;
        case BasicFlowType.Overheat:
          this.actor.beginOverheatFlow();
          break;
        case BasicFlowType.Structure:
          this.actor.beginStructureFlow();
          break;
        case BasicFlowType.Overcharge:
          this.actor.beginOverchargeFlow();
          break;
        case BasicFlowType.Burn:
          this.actor.beginBurnFlow();
          break;
        case BasicFlowType.BasicAttack:
          this.actor.beginBasicAttackFlow(flowArgs?.title ?? undefined);
          break;
        case BasicFlowType.Damage:
          this.actor.beginDamageFlow(flowArgs?.title ?? undefined);
          break;
        case BasicFlowType.TechAttack:
          this.actor.beginBasicTechAttackFlow(flowArgs?.title ?? undefined);
          break;
      }
    });

    $root.on("click.lancerActorFlowUi", ".roll-stat", { capture: true }, ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const el = $(ev.currentTarget as HTMLElement).closest("[data-uuid]")[0] as HTMLElement;
      const statPath = el.dataset.path;
      if (!statPath) throw Error("No stat path found!");
      (this.actor as LancerActor).beginStatFlow(statPath);
    });

    $root.on("click.lancerActorFlowUi", ".roll-attack", { capture: true }, ev => {
      if (!ev.currentTarget) return;
      ev.preventDefault();
      ev.stopPropagation();
      const weaponElement = $(ev.currentTarget as HTMLElement).closest("[data-uuid]")[0] as HTMLElement;
      const weaponId = weaponElement.dataset.uuid;
      const weapon = LancerItem.fromUuidSync(weaponId ?? "", `Invalid weapon ID: ${weaponId}`);
      weapon.beginWeaponAttackFlow();
    });

    $root.on("click.lancerActorFlowUi", ".roll-tech", { capture: true }, ev => {
      if (!ev.currentTarget) return;
      ev.preventDefault();
      ev.stopPropagation();
      const techElement = $(ev.currentTarget as HTMLElement).closest("[data-uuid]")[0] as HTMLElement;
      const techId = techElement.dataset.uuid;
      const techItem = LancerItem.fromUuidSync(techId ?? "", `Invalid weapon ID: ${techId}`);
      techItem.beginTechAttackFlow();
    });

    $root.on("click.lancerActorFlowUi", ".roll-damage", { capture: true }, ev => {
      if (!ev.currentTarget) return;
      ev.preventDefault();
      ev.stopPropagation();
      const el = $(ev.currentTarget as HTMLElement).closest("[data-uuid]")[0] as HTMLElement;
      const itemId = el.dataset.uuid;
      const item = LancerItem.fromUuidSync(itemId ?? "", `Invalid item ID: ${itemId}`);
      item.beginDamageFlow();
    });

    $root.on("click.lancerActorFlowUi", ".chat-flow-button", { capture: true }, async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const el = $(ev.currentTarget as HTMLElement).closest("[data-uuid]")[0] as HTMLElement;
      if (!el || !el.dataset.uuid) throw Error(`No item UUID found!`);
      const item = await LancerItem.fromUuid(el.dataset.uuid);
      if (!item) throw Error(`UUID "${el.dataset.uuid}" does not resolve to an item!`);
      beginItemChatFlow(item, el.dataset);
    });

    $root.on("click.lancerActorFlowUi", ".skill-flow", { capture: true }, ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const el = $(ev.currentTarget as HTMLElement).closest("[data-uuid]")[0] as HTMLElement;
      const skillId = el.dataset.uuid;
      const skill = LancerItem.fromUuidSync(skillId ?? "", `Invalid skill ID: ${skillId}`);
      skill.beginSkillFlow();
    });

    $root.on("click.lancerActorFlowUi", ".bond-power-flow", { capture: true }, ev => {
      if (!ev.currentTarget) return;
      ev.preventDefault();
      ev.stopPropagation();
      const powerElement = $(ev.currentTarget as HTMLElement).closest("[data-uuid]")[0] as HTMLElement;
      const bondId = powerElement.dataset.uuid;
      const bond = LancerItem.fromUuidSync(bondId ?? "", `Invalid bond ID: ${bondId}`);
      const powerIndex = parseInt(powerElement.dataset.powerIndex ?? "-1");
      bond.beginBondPowerFlow(powerIndex);
    });

    $root.on("click.lancerActorFlowUi", ".bond-xp-button", { capture: true }, ev => {
      if (!ev.currentTarget) return;
      ev.preventDefault();
      ev.stopPropagation();
      const actor = this.actor as LancerActor;
      if (!actor.is_pilot() || !actor.system.bond) return;
      actor.tallyBondXP();
    });

    $root.on("click.lancerActorFlowUi", ".refresh-powers-button", { capture: true }, ev => {
      if (!ev.currentTarget) return;
      ev.preventDefault();
      ev.stopPropagation();
      const actor = this.actor as LancerActor;
      if (!actor.is_pilot() || !actor.system.bond) return;
      actor.system.bond.refreshPowers();
    });

    $root.on("click.lancerActorFlowUi", ".effect-flow", { capture: true }, ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const el = (ev.currentTarget as HTMLElement).closest("[data-uuid]") as HTMLElement;
      const itemId = el.dataset.uuid;
      const item = LancerItem.fromUuidSync(itemId ?? "", `Invalid item ID: ${itemId}`);
      item.beginSystemFlow();
    });

    $root.on("click.lancerActorFlowUi", ".activation-flow", { capture: true }, ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const el = ev.currentTarget as HTMLElement;
      const itemId = el.dataset.uuid;
      const path = el.dataset.path;
      if (!itemId || !path) throw Error("No item ID from activation chip");
      const isDeployable = path.includes("deployable");
      const isAction = !isDeployable && path.includes("action");
      const isCoreSystem = !isDeployable && path.includes("core_system");
      const item = LancerItem.fromUuidSync(itemId ?? "", `Invalid item ID: ${itemId}`);
      if (isAction) {
        item.beginActivationFlow(path);
      } else if (isCoreSystem) {
        item.beginCoreActiveFlow(path);
      } else if (isDeployable) {
        // TODO - deployable actions
      } else {
        ui.notifications!.error("Could not infer action type");
      }
    });

    $root.on("click.lancerActorFlowUi", ".charge-macro", { capture: true }, ev => {
      ev.preventDefault();
      ev.stopPropagation();
      this.actor.beginRechargeFlow();
    });
  }

  /**
   * Handles inventory button
   */
  _activateInventoryButton(html: any) {
    let button = html.find(".inventory button");

    button.on("click", async (ev: Event) => {
      ev.preventDefault();
      return InventoryDialog.show_inventory(this.actor as LancerActor);
    });
  }

  // A grand filter that pre-decides if we can drop an item ref anywhere within this sheet. Should be implemented by child sheets
  // We generally assume that a global item is droppable if it matches our types, and that an owned item is droppable if it is owned by this actor
  // This is more of a permissions/suitability question
  canRootDrop(_item: ResolvedDropData): boolean {
    return false;
  }

  // This function is called on any dragged item that percolates down to root without being handled
  // Override/extend as appropriate
  async onRootDrop(_item: ResolvedDropData, _event: JQuery.DropEvent, _dest: JQuery<HTMLElement>): Promise<void> {}

  // Override base behavior
  protected _createDragDropHandlers(): DragDrop[] {
    return [];
  }

  // Makes us own (or rather, creates an owned copy of) the provided item if we don't already.
  // The second return value indicates whether a new copy was made (true), or if we already owned it/it is an actor (false)
  // Note: this operation also fixes limited to be the full capability of our actor
  async quickOwn(document: LancerItem): Promise<[LancerItem, boolean]> {
    return this.actor.quickOwn(document);
  }

  // As quick_own, but for any drop. Maintains drop structure, since not necessarily guaranteed to have made an item
  async quickOwnDrop(drop: ResolvedDropData): Promise<[ResolvedDropData, boolean]> {
    if (drop.type == "Item") {
      let [document, new_] = await this.quickOwn(drop.document);
      return [
        {
          type: "Item",
          document,
        },
        new_,
      ];
    } else {
      return [drop, false];
    }
  }

  _propagateData(formData: any): any {
    // Pushes relevant field data from the form to other appropriate locations,
    // e.x. to synchronize name between token and actor
    let token = this.actor.prototypeToken;

    if (!token) {
      // Set the prototype token image if the prototype token isn't initialized
      formData["prototypeToken.texture.src"] = formData["img"];
      formData["prototypeToken.name"] = formData["name"];
    } else {
      // Update token image if it matches the old actor image - keep in sync
      if (this.actor.img === token.texture.src && this.actor.img !== formData["img"]) {
        formData["prototypeToken.texture.src"] = formData["img"];
      }
      // Ditto for name
      if (this.actor.name === token["name"] && this.actor.name !== formData["name"]) {
        formData["prototypeToken.name"] = formData["name"];
      }
    }
  }

  protected override async _prepareContext(
    options: Partial<foundry.applications.types.ApplicationRenderOptions>
  ): Promise<LancerActorSheetData<T>> {
    const data = (await super._prepareContext(options)) as LancerActorSheetData<T>;
    data.actor = (data.actor ?? this.document) as LancerActor;
    data.collapse = {};
    data.system = this.actor.system;
    if (data.system.loadout) {
      for (const [key, value] of Object.entries(data.system.loadout)) {
        if (!Array.isArray(value)) continue;
        (data.system.loadout as Record<string, unknown>)[key] = (
          value as { id: string; status: string; value: LancerItem }[]
        ).sort(
          (a: { value?: { sort?: number } }, b: { value?: { sort?: number } }) =>
            (a?.value?.sort ?? 0) - (b?.value?.sort ?? 0)
        );
      }
    }
    data.itemTypes = this.actor.itemTypes;
    for (const [key, value] of Object.entries(data.itemTypes)) {
      (data.itemTypes as Record<string, LancerItem[]>)[key] = (value as LancerItem[]).sort(
        (a: LancerItem, b: LancerItem) => a.sort - b.sort
      );
    }
    data.effect_categories = LancerActiveEffect.prepareActiveEffectCategories(this.actor);
    data.deployables = lookupOwnedDeployables(this.actor);
    return data;
  }
}
