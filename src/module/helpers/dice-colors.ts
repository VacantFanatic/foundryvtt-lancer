/**
 * Helpers for coloring accuracy and difficulty dice in chat output and
 * Dice So Nice 3D rolls. Accuracy is shown in green, difficulty in red.
 */

export const ACC_FLAVOR = "Accuracy";
export const DIFF_FLAVOR = "Difficulty";

export const ACC_COLORSET = "lancer-accuracy";
export const DIFF_COLORSET = "lancer-difficulty";

const ACC_FLAVOR_CLASS = "lancer-acc-flavor";
const DIFF_FLAVOR_CLASS = "lancer-diff-flavor";

/**
 * Build the dice-formula fragment used for an accuracy/difficulty roll.
 * The total is the net acc-diff value (positive => accuracy, negative => difficulty).
 * Returns a leading-space string such as " + 2d6kh1[Accuracy]" or " - 1d6[Difficulty]",
 * suitable for concatenation into a larger formula. Returns "" when total is zero.
 */
export function accDiffRollFragment(total: number): string {
  if (!total) return "";
  const sign = total > 0 ? "+" : "-";
  const abs = Math.abs(total);
  const dice = abs === 1 ? "1d6" : `${abs}d6kh1`;
  const flavor = total > 0 ? ACC_FLAVOR : DIFF_FLAVOR;
  return ` ${sign} ${dice}[${flavor}]`;
}

/**
 * Walk the dice in an evaluated Roll and tag accuracy/difficulty terms with
 * Dice So Nice colorset metadata so 3D dice render in green/red.
 */
export function applyAccDiffDsnColors(roll: Roll): void {
  for (const die of roll.dice) {
    const flavor = die.flavor ?? die.options?.flavor;
    if (!flavor) continue;
    if (flavor === ACC_FLAVOR) {
      die.options.appearance = { ...(die.options.appearance ?? {}), colorset: ACC_COLORSET };
    } else if (flavor === DIFF_FLAVOR) {
      die.options.appearance = { ...(die.options.appearance ?? {}), colorset: DIFF_COLORSET };
    }
  }
}

/**
 * Add identifying classes to the accuracy/difficulty `part-flavor` spans in a
 * rendered roll tooltip so they can be styled green/red via CSS.
 */
export function colorizeAccDiffTooltip(tt: string): string {
  if (!tt) return tt;
  return tt
    .replace(
      new RegExp(`(<span class="part-flavor">)(${ACC_FLAVOR})(</span>)`, "g"),
      `<span class="part-flavor ${ACC_FLAVOR_CLASS}">$2$3`
    )
    .replace(
      new RegExp(`(<span class="part-flavor">)(${DIFF_FLAVOR})(</span>)`, "g"),
      `<span class="part-flavor ${DIFF_FLAVOR_CLASS}">$2$3`
    );
}
