import tippy from "tippy.js";
import type { ActionTrackingData, ActionType } from ".";
import type { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { buildActionManagerRenderContext, resolveActionManagerActor } from "./action-manager-context";
import { getActions, modAction, toggleAction } from "./action-tracker";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

declare module "fvtt-types/configuration" {
  interface FlagConfig {
    User: {
      lancer: {
        "action-manager"?: {
          pos?: {
            top: number;
            left: number;
          };
        };
      };
    };
  }
}

export class LancerActionManager extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEF_LEFT = 600;
  static DEF_TOP = 20;
  static enabled: boolean;
  static PARTS = {
    body: { template: "systems/lancer/templates/window/action_manager.hbs" },
  };
  static DEFAULT_OPTIONS = {
    id: "action-manager",
    position: {
      width: 300,
      /* Height follows content (label + control row); see _action-manager.scss */
      height: "auto",
      left: LancerActionManager.DEF_LEFT,
      top: LancerActionManager.DEF_TOP,
    },
    window: {
      title: "action-manager",
      minimizable: false,
      resizable: false,
      frame: false,
    },
    classes: ["lancer"],
  };

  target: LancerActor | null = null;

  async init() {
    // TODO: find the correct place to specify what game.system.id is expected to be
    LancerActionManager.enabled =
      game.settings.get(game.system.id, LANCER.setting_actionTracker).showHotbar &&
      !game.settings.get("core", "noCanvas");
    if (LancerActionManager.enabled) {
      await this.updateControlledToken();
      await this.render(true);
      await this.loadUserPos();
    }
  }

  #actionManagerContext(): ReturnType<typeof buildActionManagerRenderContext> {
    const trackerSettings = game.settings.get(game.system.id, LANCER.setting_actionTracker);
    return buildActionManagerRenderContext({
      actor: this.target,
      clickable: !!(game.user?.isGM || trackerSettings.allowPlayers),
      showTextLabels: trackerSettings.showTextLabels,
      position: this.position,
    });
  }

  async _prepareContext(options: Record<string, unknown>) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, this.#actionManagerContext());
  }

  protected override async _preparePartContext(partId: string, context: any, options: any) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId !== "body") return partContext;
    return foundry.utils.mergeObject(partContext ?? context, this.#actionManagerContext());
  }

  // DATA BINDING
  /**
   * Get proxy for ease of migration when we change over to MM data backing.
   * @returns actions map.
   */
  private getActions(): ActionTrackingData | null {
    return this.target ? getActions(this.target) : null;
  }

  async reset() {
    await this.close();
    this.render(true);
  }

  async update(_force?: boolean) {
    if (LancerActionManager.enabled) {
      // console.log("Action Manager updating...");
      await this.updateControlledToken();
      this.render(true);
    }
  }

  async updateConfig() {
    if (
      game.settings.get(game.system.id, LANCER.setting_actionTracker).showHotbar &&
      !game.settings.get("core", "noCanvas")
    ) {
      await this.update();
      LancerActionManager.enabled = true;
    } else {
      this.close();
      LancerActionManager.enabled = false;
    }
  }

  private async updateControlledToken() {
    if (!canvas.ready) return;
    const token = canvas.tokens?.controlled?.[0];
    const actor = resolveActionManagerActor(token);
    this.target = actor ? (token!.actor as LancerActor) : null;
  }

  /**
   * Resets actions to their default state.
   */
  private async resetActions() {
    if (this.target) {
      await modAction(this.target, false);
      await this.update();

      // await ChatMessage.create({ user: game.userId, whisper: game.users!.contents.filter(u => u.isGM).map(u => u.id), content: `${this.target.name} has had their actions manually reset.` }, {})
    }
  }

  /**
   * Foundry resolves `position.height: "auto"` to a measured pixel height on the host element.
   * That leaves a fixed box taller than the header + icon row; drop the inline height so CSS
   * (`#action-manager { height: fit-content }`) sizes the app to its content.
   */
  protected override _onPosition(position: foundry.applications.types.ApplicationPosition): void {
    super._onPosition(position);
    this.position.height = "auto";
    this.element?.style.removeProperty("height");
  }

  // UI //
  _onRender(context: object, options: Record<string, unknown>) {
    super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    this.bindDragHandle();

    // Enable reset.
    root.querySelector("#action-manager-reset")?.addEventListener("click", async e => {
      e.preventDefault();
      if (this.canMod()) {
        await this.resetActions();
      } else {
        ui.notifications?.warn(`${game.user?.name} cannot reset actions via the action tracker.`, { localize: false });
      }
    });

    // Enable action toggles.
    root.querySelectorAll<HTMLAnchorElement>("a.action[data-lancer-action]").forEach(anchor =>
      anchor.addEventListener("click", async e => {
        e.preventDefault();
        e.stopPropagation();
        if (this.canMod()) {
          const action = (e.currentTarget as HTMLElement).dataset.lancerAction;
          if (action && this.target) {
            await toggleAction(this.target, action as ActionType);
            await this.update();
          }
        } else {
          ui.notifications?.warn(`${game.user?.name} cannot toggle actions via the action tracker.`, {
            localize: false,
          });
        }
      })
    );

    // Enable tooltips.
    this.loadTooltips();
  }

  private async loadUserPos() {
    if (!game.user?.getFlag(game.system.id, "action-manager")?.pos) return;

    const pos = game.user.getFlag(game.system.id, "action-manager")!.pos!;
    const newTop = pos.top < 5 || pos.top > window.innerHeight + 5 ? LancerActionManager.DEF_TOP : pos.top;
    const newLeft = pos.left < 5 || pos.left > window.innerWidth + 5 ? LancerActionManager.DEF_LEFT : pos.left;

    this.position.top = newTop;
    this.position.left = newLeft;
    await this.setPosition({ top: newTop, left: newLeft });
  }

  private loadTooltips() {
    const localizeTip = (key: string) => game.i18n.localize(key);
    tippy('.action[data-lancer-action="protocol"]', { content: localizeTip("lancer.actionTracker.actions.protocol") });
    tippy('.action[data-lancer-action="full"]', { content: localizeTip("lancer.actionTracker.actions.full") });
    tippy('.action[data-lancer-action="quick"]', { content: localizeTip("lancer.actionTracker.actions.quick") });
    tippy('.action[data-lancer-action="move"]', { content: localizeTip("lancer.actionTracker.actions.move") });
    tippy('.action[data-lancer-action="reaction"]', { content: localizeTip("lancer.actionTracker.actions.reaction") });
    tippy('.action[data-lancer-action="free"]', { content: localizeTip("lancer.actionTracker.actions.free") });
  }

  // HELPERS //

  private bindDragHandle() {
    const handle = this.element?.querySelector<HTMLElement>("#action-manager-drag");
    if (!handle) return;

    handle.onmousedown = (ev: MouseEvent) => {
      ev.preventDefault();
      const startX = ev.clientX;
      const startY = ev.clientY;
      const startLeft = this.position.left ?? LancerActionManager.DEF_LEFT;
      const startTop = this.position.top ?? LancerActionManager.DEF_TOP;

      const onMove = (e: MouseEvent) => {
        e.preventDefault();
        void this.setPosition({
          left: startLeft + (e.clientX - startX),
          top: startTop + (e.clientY - startY),
        });
      };

      const onUp = (e: MouseEvent) => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const left = Math.max(0, startLeft + (e.clientX - startX));
        const top = Math.max(0, startTop + (e.clientY - startY));
        this.position.left = left;
        this.position.top = top;
        void this.setPosition({ left, top });
        void game.user?.update({ flags: { lancer: { "action-manager": { pos: { top, left } } } } });
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
  }

  private canMod() {
    return game.user?.isGM || game.settings.get(game.system.id, LANCER.setting_actionTracker).allowPlayers;
  }
}
