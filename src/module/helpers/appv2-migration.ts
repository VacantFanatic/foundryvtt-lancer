const V1_BASES = new Set(["Application", "FormApplication", "Dialog"]);

/**
 * Runtime guardrail to make lingering V1 apps visible during QA.
 * This intentionally does not throw; it logs once per class name.
 */
const warnedClasses = new Set<string>();
export function warnIfUsingV1App(klass: Function, label?: string): void {
  const base = Object.getPrototypeOf(klass);
  const baseName = base?.name;
  if (!baseName || !V1_BASES.has(baseName)) return;

  const name = label ?? klass.name ?? "UnknownClass";
  if (warnedClasses.has(name)) return;
  warnedClasses.add(name);

  console.warn(`[LANCER][AppV2] ${name} still extends V1 ${baseName}. Migrate to ApplicationV2.`);
}
