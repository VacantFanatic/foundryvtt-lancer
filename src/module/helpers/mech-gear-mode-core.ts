export type GearTabMode = "play" | "edit";

/** Resolve gear tab display mode from a data attribute value. */
export function resolveGearTabMode(value: string | null | undefined): GearTabMode {
  return value === "edit" ? "edit" : "play";
}

/** Whether the full loadout editor should render for the current gear mode. */
export function shouldShowLoadoutEditor(mode: GearTabMode): boolean {
  return mode === "edit";
}
