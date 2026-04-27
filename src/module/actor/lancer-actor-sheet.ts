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
  handleUsesInteraction,
} from "../helpers/refs";
import { LancerItem } from "../item/lancer-item";
import { lookupOwnedDeployables } from "../util/lid";
import { LancerActor, type LancerActorType } from "./lancer-actor";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerActorSheet<T extends LancerActorType> extends foundry.appv1.sheets.ActorSheet<ActorSheet.Options> {
  // Tracks collapse state between renders
  protected collapse_handler = new CollapseHandler();

  /** Allow detached instances to render with a unique application id. */
  get id(): string {
    const detachedKey = (this.options as ActorSheet.Options & { detachedKey?: string })?.detachedKey;
    if (!detachedKey) return super.id;
    return `${super.id}-${detachedKey}`;
  }

  static get defaultOptions(): ActorSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      scrollY: [".scroll-body"],
    });
  }

  protected _onDetachSheet(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this._detachSheet();
  }

  protected _triggerNativeDetach(): boolean {
    const header = this.element?.find(".window-header");
    if (!header?.length) return false;
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
    const ImagePopoutCls =
      (foundry as any).applications?.apps?.ImagePopout ?? (globalThis as any).ImagePopout;
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
    const app = this.element;
    if (!app?.length) return;
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
  activateListeners(html: JQuery) {
    super.activateListeners(html);
    this._injectHeaderDetachControl();

    // Enable collapse triggers.
    initializeCollapses(html);
    applyCollapseListeners(html);

    // Enable any action grid buttons.
    this._activateActionGridListeners(html);

    // Make generic refs clickable to open the item
    handleRefClickOpen(html);

    // Enable ref dragging
    handleRefDragging(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // All-actor macros
    this._activateFlowListeners(html);

    // All-actor macro dragging
    this._activateFlowDragging(html);

    // Make +/- buttons work
    handleInputPlusMinusButtons(html, this.actor);

    // Make counter pips work
    handleCounterInteraction(html, this.actor);

    // Enable hex use triggers.
    handleUsesInteraction(html, this.actor);

    // Enable loading hex triggers.
    handleLoadedInteraction(html, this.actor);

    // Enable charged hex triggers.
    handleChargedInteraction(html, this.actor);

    // Enable power use triggers.
    handlePowerUsesInteraction(html, this.actor);

    // Enable context menu triggers.
    handleContextMenus(html, this.actor);

    // Enable viewing inventory on sheets that support it
    this._activateInventoryButton(html);

    // Make refs droppable, in such a way that we take ownership when dropped
    handleRefSlotDropping(html, this.actor, x => this.quickOwnDrop(x).then(v => v[0]));

    // Enable general controls, so items can be deleted and such
    handleGenControls(html, this.actor);

    // Enable popout editors
    handlePopoutTextEditor(html, this.actor);

    // Add export button.
    // addExportButton(this.object, html);

    // Add root dropping
    handleDocDropping(
      html,
      async (entry, _dest, _event) => this.onRootDrop(entry, _event, _dest),
      (entry, _dest, _event) => this.canRootDrop(entry)
    );
  }

  _activateFlowDragging(html: JQuery) {
    const FlowDragHandler = (e: DragEvent) => this._onFlowButtonDragStart(e);

    html
      .find(".lancer-flow-button")
      .add(".roll-stat")
      .add(".roll-attack")
      .add(".roll-tech")
      .add(".roll-damage")
      .add(".chat-flow-button")
      .add(".skill-flow")
      .add(".bond-power-flow")
      .add(".effect-flow")
      .add(".activation-flow")
      .each((_i, item) => {
        item.setAttribute("draggable", "true");
        item.addEventListener("dragstart", FlowDragHandler, false);
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
    console.log("Flow drag data:", data, e.dataTransfer?.getData("text/plain"));
  }

  async _activateActionGridListeners(html: JQuery) {
    let elements = html.find(".lancer-action-button");
    elements.on("click", async ev => {
      ev.stopPropagation();

      if (game.user?.isGM || game.settings.get(game.system.id, LANCER.setting_actionTracker).allowPlayers) {
        const params = ev.currentTarget.dataset;
        const action = params.action as ActionType | undefined;
        const data = await this.getData();
        if (action && params.val) {
          let spend: boolean;
          if (params.action === "move") {
            spend = parseInt(params.val) > 0;
          } else {
            spend = params.val === "true";
          }
          modAction((<any>data).actor as LancerActor, spend, action);
        }
      } else {
        console.log(`${game.user?.name} :: Users currently not allowed to toggle actions through action manager.`);
      }
    });
  }

  _activateFlowListeners(html: JQuery) {
    // Basic flow buttons
    let actorFlows = html.find(".lancer-flow-button");
    actorFlows.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation();
      // Check data-flow-type to pick which flow to trigger
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

    // Stat rollers
    let statRollers = html.find(".roll-stat");
    statRollers.on("click", ev => {
      ev.stopPropagation(); // Avoids triggering parent event handlers
      const el = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;

      const statPath = el.dataset.path;
      if (!statPath) throw Error("No stat path found!");

      const actor = this.actor as LancerActor;
      actor.beginStatFlow(statPath);
    });

    // Weapon rollers
    let weaponRollers = html.find(".roll-attack");
    weaponRollers.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation();

      const weaponElement = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const weaponId = weaponElement.dataset.uuid;
      const weapon = LancerItem.fromUuidSync(weaponId ?? "", `Invalid weapon ID: ${weaponId}`);
      weapon.beginWeaponAttackFlow();
    });

    let techRollers = html.find(".roll-tech");
    techRollers.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation();

      const techElement = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const techId = techElement.dataset.uuid;
      const techItem = LancerItem.fromUuidSync(techId ?? "", `Invalid weapon ID: ${techId}`);
      techItem.beginTechAttackFlow();
    });

    let damageRollers = html.find(".roll-damage");
    damageRollers.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation();

      const el = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const itemId = el.dataset.uuid;
      const item = LancerItem.fromUuidSync(itemId ?? "", `Invalid item ID: ${itemId}`);
      item.beginDamageFlow();
    });

    let itemFlows = html.find(".chat-flow-button");
    itemFlows.on("click", async ev => {
      ev.stopPropagation(); // Avoids triggering parent event handlers
      const el = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      if (!el || !el.dataset.uuid) throw Error(`No item UUID found!`);
      const item = await LancerItem.fromUuid(el.dataset.uuid);
      if (!item) throw Error(`UUID "${el.dataset.uuid}" does not resolve to an item!`);
      beginItemChatFlow(item, el.dataset);
    });

    let skillFlows = html.find(".skill-flow");
    skillFlows.on("click", ev => {
      ev.stopPropagation(); // Avoids triggering parent event handlers

      const el = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const skillId = el.dataset.uuid;
      const skill = LancerItem.fromUuidSync(skillId ?? "", `Invalid skill ID: ${skillId}`);
      skill.beginSkillFlow();
    });

    // Bond Power flow
    let powerFlows = html.find(".bond-power-flow");
    powerFlows.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation();

      const powerElement = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
      const bondId = powerElement.dataset.uuid;
      const bond = LancerItem.fromUuidSync(bondId ?? "", `Invalid bond ID: ${bondId}`);
      const powerIndex = parseInt(powerElement.dataset.powerIndex ?? "-1");
      bond.beginBondPowerFlow(powerIndex);
    });

    // Bond XP
    let bondXp = html.find(".bond-xp-button");
    bondXp.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation();

      const actor = this.actor as LancerActor;
      if (!actor.is_pilot() || !actor.system.bond) return;
      actor.tallyBondXP();
    });

    // Refresh Bond powers
    let bondRefresh = html.find(".refresh-powers-button");
    bondRefresh.on("click", ev => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation();

      const actor = this.actor as LancerActor;
      if (!actor.is_pilot() || !actor.system.bond) return;
      actor.system.bond.refreshPowers();
    });

    // Non-action system use flows
    html.find(".effect-flow").on("click", ev => {
      ev.stopPropagation();
      const el = ev.currentTarget.closest("[data-uuid]") as HTMLElement;
      const itemId = el.dataset.uuid;
      const item = LancerItem.fromUuidSync(itemId ?? "", `Invalid item ID: ${itemId}`);
      item.beginSystemFlow();
    });

    // Action-chip flows
    html.find(".activation-flow").on("click", ev => {
      ev.stopPropagation();

      const el = ev.currentTarget;

      const itemId = el.dataset.uuid;
      const path = el.dataset.path;
      if (!itemId || !path) throw Error("No item ID from activation chip");

      let isDeployable = path.includes("deployable");
      let isAction = !isDeployable && path.includes("action");
      let isCoreSystem = !isDeployable && path.includes("core_system");

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

    let ChargeMacro = html.find(".charge-macro");
    ChargeMacro.on("click", ev => {
      ev.stopPropagation(); // Avoids triggering parent event handlers

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

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(_event: Event, formData: any): Promise<LancerActor | undefined> {
    // Automatically propagates changes to image/name
    this._propagateData(formData);

    // Simple writeback
    await this.actor.update(formData);

    return this.actor;
  }

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  async getData(): Promise<object> {
    const data: any = await super.getData(); // Not fully populated yet!
    data.collapse = {};
    data.system = this.actor.system; // Alias
    if (data.system.loadout) {
      for (const [key, value] of Object.entries(data.system.loadout)) {
        if (!Array.isArray(value)) continue;
        data.system.loadout[key] = (value as { id: string; status: string; value: LancerItem }[]).sort(
          (a: any, b: any) => a?.value?.sort - b?.value?.sort
        );
      }
    }
    data.itemTypes = this.actor.itemTypes;
    for (const [key, value] of Object.entries(data.itemTypes)) {
      data.itemTypes[key] = (value as LancerItem[]).sort((a: any, b: any) => a.sort - b.sort);
    }
    data.effect_categories = LancerActiveEffect.prepareActiveEffectCategories(this.actor);
    data.deployables = lookupOwnedDeployables(this.actor);
    console.log(`${lp} Rendering with following actor ctx: `, data);
    return data;
  }
}
