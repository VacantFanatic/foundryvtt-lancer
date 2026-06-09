import type { ActionTrackingData } from ".";

export interface ActionManagerTokenLike {
  combatant?: unknown;
  inCombat?: boolean;
  actor?: ActionManagerActorLike;
}

export interface ActionManagerActorLike {
  name: string;
  is_mech(): boolean;
  is_npc(): boolean;
  system: { action_tracker: ActionTrackingData };
}

export interface ActionManagerRenderContext {
  name?: string;
  actions: ActionTrackingData | null;
  clickable: boolean;
  showTextLabels: boolean;
  positionWidth: number;
}

export function isTokenInCombatEncounter(token: ActionManagerTokenLike): boolean {
  return !!(token.combatant ?? token.inCombat);
}

export function resolveActionManagerActor(
  token: ActionManagerTokenLike | null | undefined
): ActionManagerActorLike | null {
  if (!token?.actor) return null;
  if (!isTokenInCombatEncounter(token)) return null;
  if (!token.actor.is_mech() && !token.actor.is_npc()) return null;
  return token.actor;
}

export function getActionTrackerData(actor: ActionManagerActorLike): ActionTrackingData | null {
  if (!actor.is_mech() && !actor.is_npc()) return null;
  return actor.system.action_tracker ?? null;
}

export function resolveActionManagerWidth(position: { width?: number | string }): number {
  if (typeof position.width === "number") return position.width;
  const parsed = Number.parseInt(String(position.width ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : 300;
}

export function buildActionManagerRenderContext(options: {
  actor: ActionManagerActorLike | null;
  clickable: boolean;
  showTextLabels: boolean;
  position: { width?: number | string };
}): ActionManagerRenderContext {
  const { actor, clickable, showTextLabels, position } = options;
  return {
    name: actor?.name.toLocaleUpperCase(),
    actions: actor ? getActionTrackerData(actor) : null,
    clickable,
    showTextLabels,
    positionWidth: resolveActionManagerWidth(position),
  };
}

export function shouldShowActionManagerSurface(context: Pick<ActionManagerRenderContext, "actions">): boolean {
  return context.actions != null;
}
