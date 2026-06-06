/** Localized `aria-label="..."` attribute for icon-only controls. */
export function ariaLabelAttr(key: string): string {
  const label = game.i18n.localize(key).replace(/"/g, "&quot;");
  return `aria-label="${label}"`;
}
