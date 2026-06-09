export const COMBAT_TRACKER_DISPOSITION_CLASSES: Record<number, string> = {
  [-2]: "",
  [-1]: "enemy",
  [0]: "neutral",
  [1]: "friendly",
  [2]: "player",
};

export interface CombatTrackerTurnInput {
  id: string;
  css: string;
  name: string;
  img: string;
  hidden: boolean;
  isDefeated: boolean;
  canPing: boolean;
  resource: string | null;
  pending?: number;
  effects?: { tooltip?: string; icons?: { img: string; name?: string }[] };
  buttons?: CombatTrackerTurnButton[];
}

export interface CombatTrackerTurnButton {
  icon: string;
  action: string;
}

export interface CombatTrackerCombatantLike {
  id: string;
  disposition: number;
  activations: { max?: number; value?: number };
}

export interface EnrichCombatTrackerTurnsOptions {
  turns: CombatTrackerTurnInput[] | undefined;
  getCombatant: (id: string) => CombatTrackerCombatantLike | undefined;
  activeCombatantId?: string | null;
  appearance: { icon: string; deactivate: string };
  sort: boolean;
}

export type EnrichedCombatTrackerTurn = CombatTrackerTurnInput & {
  buttons: CombatTrackerTurnButton[];
  activations?: number;
  pending?: number;
};

/** Merge tracker-only fields from super._prepareTrackerContext onto the shared render context. */
export function mergeCombatTrackerContext<T extends { turns?: CombatTrackerTurnInput[] }>(
  ctx: T,
  trackerFields?: Partial<T> | void
): T {
  if (!trackerFields) return ctx;
  if (trackerFields.turns) ctx.turns = trackerFields.turns;
  return Object.assign(ctx, trackerFields);
}

export function enrichCombatTrackerTurns(
  options: EnrichCombatTrackerTurnsOptions
): EnrichedCombatTrackerTurn[] | undefined {
  const { turns, getCombatant, activeCombatantId, appearance, sort } = options;
  if (turns == null) return undefined;

  const enriched = turns.map(t => {
    const combatant = getCombatant(t.id);
    const buttons: CombatTrackerTurnButton[] = Array.from(Array(combatant?.activations.value ?? 0), () => ({
      icon: appearance.icon,
      action: "activateCombatantTurn",
    }));
    if (combatant?.id === activeCombatantId) {
      buttons.push({ icon: appearance.deactivate, action: "deactivateCombatantTurn" });
    }

    const effects = t.effects ?? { tooltip: "", icons: [] };

    return {
      ...t,
      css: `${String(t.css ?? "").trim()} ${COMBAT_TRACKER_DISPOSITION_CLASSES[combatant?.disposition ?? -2]}`.trim(),
      buttons,
      activations: combatant?.activations.max,
      pending: combatant?.activations.value,
      effects: {
        tooltip: effects.tooltip ?? "",
        icons: effects.icons ?? [],
      },
    };
  });

  if (sort) {
    enriched.sort((a, b) => {
      const aa = a.css.indexOf("active") !== -1 ? 1 : 0;
      const ba = b.css.indexOf("active") !== -1 ? 1 : 0;
      if (ba - aa !== 0) return ba - aa;
      const ad = a.pending === 0 ? 1 : 0;
      const bd = b.pending === 0 ? 1 : 0;
      return ad - bd;
    });
  }

  return enriched;
}
