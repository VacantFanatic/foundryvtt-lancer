export function hudL(key: string): string {
  return game.i18n.localize(`lancer.hud.${key}`);
}

export function hudT(key: string, data: Record<string, string | number> = {}): string {
  return game.i18n.format(`lancer.hud.${key}`, data);
}
