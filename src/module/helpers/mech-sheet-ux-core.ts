export interface EffectCategoryLike {
  effects: unknown[];
}

/** Count total active effects across all categories for tab badge display. */
export function countActiveEffects(categories: EffectCategoryLike[]): number {
  return categories.reduce((sum, category) => sum + category.effects.length, 0);
}

/** Format the effects tab label with an optional count badge. */
export function formatEffectsTabLabel(baseLabel: string, count: number): string {
  if (count <= 0) return baseLabel;
  return `${baseLabel} (${count})`;
}
