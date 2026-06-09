import { LANCER } from "../config.js";
import type { CombatTrackerAppearance } from "../settings.js";
import { enrichCombatTrackerTurns } from "./combat-tracker-turns.js";
import type { LancerCombat, LancerCombatant } from "./lancer-combat.js";

import ContextMenu = foundry.applications.ux.ContextMenu;

/**
 * Overrides the display of the combat and turn order tab to add activation
 * buttons and either move or remove the initiative button
 */
export class LancerCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    foundry.applications.sidebar.tabs.CombatTracker.DEFAULT_OPTIONS,
    {
      actions: {
        activateCombatantTurn: LancerCombatTracker.#activateCombatantTurn,
        deactivateCombatantTurn: LancerCombatTracker.#deactivateCombatantTurn,
        toggleCombatantTarget: LancerCombatTracker.#toggleCombatantTarget,
      },
    },
    { inplace: false }
  );
  static PARTS = foundry.utils.mergeObject(
    foundry.applications.sidebar.tabs.CombatTracker.PARTS,
    {
      tracker: {
        template: "systems/lancer/templates/combat/tracker.hbs",
      },
    },
    { inplace: false }
  );

  async _prepareTrackerContext(ctx: any, opts: any) {
    const combat = this.viewed;
    if (!combat) return ctx;

    if (combat.combatants.size && !combat.turns?.length) combat.setupTurns();
    await super._prepareTrackerContext(ctx, opts);

    // Core skips non-visible combatants; ensure GM still sees a row per combatant in the list.
    if (!ctx.turns?.length && combat.combatants.size) {
      ctx.turns = [];
      for (const [i, combatant] of combat.turns.entries()) {
        ctx.turns.push(await this._prepareTurnContext(combat, combatant, i));
      }
    }

    return this.#enrichTrackerPartContext(ctx, opts);
  }

  #enrichTrackerPartContext(ctx: any, _opts: any) {
    const appearance = game.settings.get(game.system.id, LANCER.setting_combat_appearance);
    const targetNames = Array.from(game.user?.targets ?? [])
      .map(t => t.document?.name ?? t.name)
      .filter(Boolean)
      .join(", ");

    ctx.turns = enrichCombatTrackerTurns({
      turns: ctx.turns,
      getCombatant: id => {
        const combatant = this.viewed?.combatants.get(id) as LancerCombatant | undefined;
        if (!combatant) return undefined;
        return {
          id: combatant.id,
          disposition: combatant.disposition,
          activations: combatant.activations,
        };
      },
      activeCombatantId: this.viewed?.combatant?.id,
      appearance,
      sort: game.settings.get(game.system.id, LANCER.setting_combat_sort),
    })?.map(t => {
      const combatant = this.viewed?.combatants.get(t.id) as LancerCombatant | undefined;
      const token = combatant?.token?.object;
      return {
        ...t,
        isTargeted: !!(token && game.user?.targets.has(token)),
        targetSummary: targetNames,
        canTarget: !!(token ?? combatant?.tokenId),
      };
    });

    return ctx;
  }

  static async #activateCombatantTurn(this: LancerCombatTracker, ev: MouseEvent, target: HTMLElement) {
    ev.stopPropagation();
    ev.preventDefault();
    const { combatantId } = target.closest<HTMLElement>("[data-combatant-id]")?.dataset ?? {};
    this.viewed?.activateCombatant(combatantId!);
  }

  static async #deactivateCombatantTurn(this: LancerCombatTracker, ev: MouseEvent, target: HTMLElement) {
    ev.stopPropagation();
    ev.preventDefault();
    const { combatantId } = target.closest<HTMLElement>("[data-combatant-id]")?.dataset ?? {};
    this.viewed?.deactivateCombatant(combatantId!);
  }

  static async #toggleCombatantTarget(this: LancerCombatTracker, ev: MouseEvent, target: HTMLElement) {
    ev.stopPropagation();
    ev.preventDefault();
    const { combatantId } = target.closest<HTMLElement>("[data-combatant-id]")?.dataset ?? {};
    const combatant = this.viewed?.combatants.get(combatantId!);
    const token = combatant?.token?.object;
    if (!token?.actor) return;
    const targeted = game.user?.targets.has(token);
    token.setTarget(!targeted, { user: game.user, releaseOthers: false });
    this.render();
  }

  /**
   * Activate the selected combatant
   */
  protected async _onActivateCombatant(
    event: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const id = btn.closest<HTMLElement>(".combatant")?.dataset.combatantId;
    if (!id) return;
    switch (btn.dataset.control) {
      case "deactivateCombatant":
        await (<LancerCombat>this.viewed!).deactivateCombatant(id);
        break;
      case "activateCombatant":
        await (<LancerCombat>this.viewed!).activateCombatant(id);
        break;
    }
  }

  protected async _onAddActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = <LancerCombatant>(
      (this.viewed!.getEmbeddedDocument("Combatant", li.data("combatant-id"), {}) as unknown)
    );
    await combatant.addActivations(1);
  }

  protected async _onRemoveActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = <LancerCombatant>(
      (this.viewed!.getEmbeddedDocument("Combatant", li.data("combatant-id"), {}) as unknown)
    );
    await combatant.addActivations(-1);
  }

  protected async _onUndoActivation(li: JQuery<HTMLElement>): Promise<void> {
    const combatant: LancerCombatant = <LancerCombatant>(
      (this.viewed!.getEmbeddedDocument("Combatant", li.data("combatant-id"), {}) as unknown)
    );
    await combatant.modifyCurrentActivations(1);
  }

  protected _getEntryContextOptions(): ContextMenu.Entry<HTMLElement>[] {
    const getCombatant = (li: HTMLElement) => this.viewed?.combatants.get(li.dataset.combatantId!);
    const m: ContextMenu.Entry<HTMLElement>[] = [
      {
        name: "LANCERINITIATIVE.AddActivation",
        icon: '<i class="fas fa-plus"></i>',
        callback: (li: HTMLElement) => getCombatant(li)?.addActivations(1),
      },
      {
        name: "LANCERINITIATIVE.RemoveActivation",
        icon: '<i class="fas fa-minus"></i>',
        callback: (li: HTMLElement) => getCombatant(li)?.addActivations(-1),
      },
      {
        name: "LANCERINITIATIVE.UndoActivation",
        icon: '<i class="fas fa-undo"></i>',
        callback: (li: HTMLElement) =>
          this.viewed
            ?.deactivateCombatant(li.dataset.combatantId!)
            .then(() => getCombatant(li)?.modifyCurrentActivations(1)),
      },
    ];
    m.push(...super._getEntryContextOptions().filter((i: any) => i.name !== "COMBAT.CombatantReroll"));
    return m;
  }
}

export function setAppearance(val?: CombatTrackerAppearance): void {
  if (!val) return;
  document.documentElement.style.setProperty("--lancer-initiative-icon-size", `${val.icon_size}rem`);
  document.documentElement.style.setProperty("--lancer-initiative-player-color", val.player_color?.toString() ?? null);
  document.documentElement.style.setProperty(
    "--lancer-initiative-friendly-color",
    val.friendly_color?.toString() ?? null
  );
  document.documentElement.style.setProperty(
    "--lancer-initiative-neutral-color",
    val?.neutral_color?.toString() ?? null
  );
  document.documentElement.style.setProperty("--lancer-initiative-enemy-color", val?.enemy_color?.toString() ?? null);
  document.documentElement.style.setProperty("--lancer-initiative-done-color", val?.done_color?.toString() ?? null);
  game.combats?.render();
}
