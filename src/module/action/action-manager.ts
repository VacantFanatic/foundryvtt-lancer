import tippy from "tippy.js";
import type { ActionTrackingData, ActionType } from ".";
import type { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
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

  async _prepareContext(options: Record<string, unknown>) {
    const context = await super._prepareContext(options);
    const data = {
      position: this.position,
      name: this.target && this.target.name.toLocaleUpperCase(),
      actions: this.getActions(),
      clickable: game.user?.isGM || game.settings.get(game.system.id, LANCER.setting_actionTracker).allowPlayers,
    };
    return foundry.utils.mergeObject(context, data);
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
    if (token && token.inCombat && token.actor) {
      const actor = token.actor as LancerActor;
      if (actor.is_mech() || actor.is_npc()) {
        this.target = token.actor;
        return;
      }
    }
    this.target = null;
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

    // Enable dragging.
    this.dragElement(root);

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
    root.querySelectorAll<HTMLAnchorElement>("a.action[data-action]").forEach(anchor =>
      anchor.addEventListener("click", async e => {
        e.preventDefault();
        if (this.canMod()) {
          const action = (e.currentTarget as HTMLElement).dataset.action;
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
    tippy('.action[data-action="protocol"]', {
      content: "Protocol",
    });
    tippy('.action[data-action="full"]', {
      content: "Full Action",
    });
    tippy('.action[data-action="quick"]', {
      content: "Quick Action",
    });
    tippy('.action[data-action="move"]', {
      content: "Movement Action",
    });
    tippy('.action[data-action="reaction"]', {
      content: "Reaction",
    });
    tippy('.action[data-action="free"]', {
      content: "Free Actions",
    });
  }

  // HELPERS //

  private dragElement(root: HTMLElement) {
    const appPos = this.position;
    const dragHandle = root.querySelector<HTMLElement>("#action-manager-drag");
    if (!dragHandle) return;
    dragHandle.onmousedown = ev => {
      ev.preventDefault();
      ev = ev || window.event;

      const hud = this.element;
      const marginLeft = parseInt(window.getComputedStyle(hud ?? root).marginLeft.replace("px", ""));
      const marginTop = parseInt(window.getComputedStyle(hud ?? root).marginTop.replace("px", ""));

      dragElement(root);
      let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;

      function dragElement(elmnt: HTMLElement) {
        elmnt.onmousedown = dragMouseDown;

        function dragMouseDown(e: MouseEvent) {
          e = e || window.event;
          e.preventDefault();
          pos3 = e.clientX;
          pos4 = e.clientY;

          document.onmouseup = closeDragElement;
          document.onmousemove = elementDrag;
        }

        function elementDrag(e: MouseEvent) {
          e = e || window.event;
          e.preventDefault();
          // calculate the new cursor position:
          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;
          // set the element's new position:
          elmnt.style.top = elmnt.offsetTop - pos2 - marginTop + "px";
          elmnt.style.left = elmnt.offsetLeft - pos1 - marginLeft + "px";
        }

        function closeDragElement() {
          // stop moving when mouse button is released:
          elmnt.onmousedown = null;
          document.onmouseup = null;
          document.onmousemove = null;
          let xPos = elmnt.offsetLeft - pos1 > window.innerWidth ? window.innerWidth : elmnt.offsetLeft - pos1;
          let yPos =
            elmnt.offsetTop - pos2 > window.innerHeight - 20 ? window.innerHeight - 100 : elmnt.offsetTop - pos2;
          xPos = xPos < 8 ? 0 : xPos - 10;
          yPos = yPos < 8 ? 0 : yPos - 3;
          if (xPos != elmnt.offsetLeft - pos1 || yPos != elmnt.offsetTop - pos2) {
            elmnt.style.top = yPos + "px";
            elmnt.style.left = xPos + "px";
          }
          game.user?.update({ flags: { lancer: { "action-manager": { pos: { top: yPos, left: xPos } } } } });
          appPos.top = yPos;
          appPos.left = xPos;
        }
      }
    };
  }

  private canMod() {
    return game.user?.isGM || game.settings.get(game.system.id, LANCER.setting_actionTracker).allowPlayers;
  }
}
