import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { LancerToken } from "../token";

type AATargetLike = LancerToken | TokenDocument | Token | null | undefined;

type AATriggerData = {
  actor: LancerActor;
  item: LancerItem | { name: string } | null;
  fallbackItemName: string;
  targets?: AATargetLike[];
  hitTargets?: AATargetLike[];
  playOnMiss?: boolean;
};

type AARuntime = {
  playAnimation: (
    sourceToken: Token,
    item: Item | { name: string },
    options?: {
      targets?: Token[] | Set<Token>;
      hitTargets?: Token[] | Set<Token>;
      playOnMiss?: boolean;
      activeEffect?: boolean;
      tieToDocuments?: boolean;
    }
  ) => Promise<void> | void;
};

type AALegacyRuntime = {
  playAnimation: (
    sourceToken: Token,
    targets: Token[] | Set<Token>,
    item: Item | { name: string },
    options?: Record<string, unknown>
  ) => Promise<void> | void;
};

const lp = LANCER.log_prefix;
const AA_MENU_KEYS = ["melee", "range", "ontoken", "templatefx", "aura", "preset", "aefx"] as const;

function defaultSound() {
  return {
    enable: false,
    delay: 0,
    file: null,
    startTime: 0,
    volume: 0.75,
    repeat: 1,
    repeatDelay: 250,
  };
}

function defaultVideo() {
  return {
    dbSection: "static",
    menuType: "spell",
    animation: "curewounds",
    variant: "01",
    color: "blue",
    enableCustom: false,
    customPath: "",
  };
}

function defaultSecondary() {
  return {
    enable: false,
    video: defaultVideo(),
    sound: defaultSound(),
    options: {
      addTokenWidth: false,
      anchor: "0.5",
      contrast: 0,
      delay: 0,
      elevation: 1000,
      fadeIn: 250,
      fadeOut: 500,
      isMasked: false,
      isRadius: true,
      isWait: false,
      opacity: 1,
      repeat: 1,
      repeatDelay: 250,
      saturate: 0,
      size: 1.5,
      tint: false,
      tintColor: "#FFFFFF",
      zIndex: 1,
    },
  };
}

function defaultPrimaryOptions() {
  return {
    onlyX: false,
    isReturning: false,
    isWait: false,
    delay: 0,
    repeat: 1,
    repeatDelay: 500,
    opacity: 1,
    elevation: 1000,
    zIndex: 1,
    saturate: 0,
    contrast: 0,
    tint: false,
    tintColor: "#FFFFFF",
  };
}

function defaultSourceOrTarget() {
  return {
    enable: false,
    video: defaultVideo(),
    sound: defaultSound(),
    options: {
      addTokenWidth: false,
      anchor: "0.5",
      contrast: 0,
      delay: 0,
      elevation: 1000,
      fadeIn: 250,
      fadeOut: 500,
      isMasked: false,
      isRadius: false,
      isWait: false,
      opacity: 1,
      repeat: 1,
      repeatDelay: 250,
      saturate: 0,
      size: 1,
      tint: false,
      tintColor: "#FFFFFF",
      zIndex: 1,
      persistent: false,
      unbindAlpha: false,
      unbindVisibility: false,
    },
  };
}

function sanitizeMenuEntry(entry: Record<string, unknown>): Record<string, unknown> {
  const out = foundry.utils.deepClone(entry);
  if (!out.soundOnly || typeof out.soundOnly !== "object") out.soundOnly = {};
  if (!((out.soundOnly as Record<string, unknown>).sound)) {
    (out.soundOnly as Record<string, unknown>).sound = defaultSound();
  }

  if (!out.primary || typeof out.primary !== "object") out.primary = {};
  const primary = out.primary as Record<string, unknown>;
  if (!primary.video || typeof primary.video !== "object") primary.video = defaultVideo();
  if (!primary.sound || typeof primary.sound !== "object") primary.sound = defaultSound();
  if (!primary.options || typeof primary.options !== "object") primary.options = defaultPrimaryOptions();
  else primary.options = { ...defaultPrimaryOptions(), ...(primary.options as Record<string, unknown>) };

  if (!out.secondary || typeof out.secondary !== "object") out.secondary = defaultSecondary();
  else {
    const secondary = out.secondary as Record<string, unknown>;
    if (!secondary.video || typeof secondary.video !== "object") secondary.video = defaultVideo();
    if (!secondary.sound || typeof secondary.sound !== "object") secondary.sound = defaultSound();
    if (!secondary.options || typeof secondary.options !== "object") secondary.options = defaultSecondary().options;
    else secondary.options = { ...defaultSecondary().options, ...(secondary.options as Record<string, unknown>) };
    if (secondary.enable === undefined) secondary.enable = false;
  }

  if (!out.source || typeof out.source !== "object") out.source = defaultSourceOrTarget();
  else {
    const source = out.source as Record<string, unknown>;
    if (!source.video || typeof source.video !== "object") source.video = defaultVideo();
    if (!source.sound || typeof source.sound !== "object") source.sound = defaultSound();
    if (!source.options || typeof source.options !== "object") source.options = defaultSourceOrTarget().options;
    else source.options = { ...defaultSourceOrTarget().options, ...(source.options as Record<string, unknown>) };
    if (source.enable === undefined) source.enable = false;
  }

  if (!out.target || typeof out.target !== "object") out.target = defaultSourceOrTarget();
  else {
    const target = out.target as Record<string, unknown>;
    if (!target.video || typeof target.video !== "object") target.video = defaultVideo();
    if (!target.sound || typeof target.sound !== "object") target.sound = defaultSound();
    if (!target.options || typeof target.options !== "object") target.options = defaultSourceOrTarget().options;
    else target.options = { ...defaultSourceOrTarget().options, ...(target.options as Record<string, unknown>) };
    if (target.enable === undefined) target.enable = false;
  }

  if (!out.macro || typeof out.macro !== "object") {
    out.macro = { enable: false, name: null, args: null, playWhen: null };
  }
  if (!out.levels3d || typeof out.levels3d !== "object") {
    out.levels3d = {
      type: "explosion",
      data: {
        color01: "#FFFFFF",
        color02: "#FFFFFF",
        spritePath: "modules/levels-3d-preview/assets/particles/dust.png",
      },
      sound: { enable: false },
      secondary: { enable: false, data: { color01: "#FFFFFF", color02: "#FFFFFF" } },
    };
  }
  return out;
}

function rinseHeaderText(text: string): string {
  let out = (text ?? "").trim();
  if (out.startsWith("//")) out = out.slice(2).trim();
  if (out.endsWith("//")) out = out.slice(0, -2).trim();
  return out;
}

function getLancerHeaderName(message: ChatMessage): string | null {
  try {
    const parser = new DOMParser();
    const messageDocument = parser.parseFromString(message.content ?? "", "text/html");
    const header = messageDocument.querySelector(".lancer-header")?.textContent ?? "";
    const rinsed = rinseHeaderText(header);
    return rinsed.length ? rinsed : null;
  } catch {
    return null;
  }
}

function stripDamageSuffix(name: string): string {
  const txt = name.trim();
  return txt.endsWith(" DAMAGE") ? txt.slice(0, -7).trim() : txt;
}

function sanitizeMenuObject(menu: Record<string, unknown>): Record<string, unknown> {
  const out = foundry.utils.deepClone(menu);
  for (const key of AA_MENU_KEYS) {
    const entries = out[key] as unknown;
    const arr = Array.isArray(entries) ? entries : [];
    out[key] = arr
      .filter((entry): entry is Record<string, unknown> => entry && typeof entry === "object")
      .map(entry => sanitizeMenuEntry(entry));
  }
  out.version = typeof out.version === "number" ? out.version : 5;
  return out;
}

async function sanitizeInstalledAutorecEntries(): Promise<void> {
  if (!(game.modules.get("autoanimations")?.active ?? false)) return;
  if (!game.user?.isGM) return;
  try {
    for (const key of AA_MENU_KEYS) {
      const settingKey = `aaAutorec-${key}`;
      const entries = game.settings.get("autoanimations", settingKey) as unknown;
      if (!Array.isArray(entries)) {
        await game.settings.set("autoanimations", settingKey, []);
        continue;
      }
      if (!entries.length) continue;
      let changed = false;
      const sanitized = entries
        .filter((entry): entry is Record<string, unknown> => {
          const valid = entry && typeof entry === "object";
          if (!valid) changed = true;
          return valid;
        })
        .map(entry => {
          const next = sanitizeMenuEntry(entry);
          if (JSON.stringify(next) !== JSON.stringify(entry)) changed = true;
          return next;
        });
      if (changed) {
        await game.settings.set("autoanimations", settingKey, sanitized);
      }
    }
  } catch (error) {
    console.warn(`${lp} Failed to sanitize AutoAnimations entries`, error);
  }
}

export async function registerAutoAnimationsHooks(): Promise<void> {
  patchBrokenAALancerHook();
  patchBrokenAAActiveEffectHooks();
  await sanitizeInstalledAutorecEntries();
  await recoverMalformedAutorecMenus();
  Hooks.on("createChatMessage", async (message: ChatMessage) => {
    if (message.user?.id && message.user.id !== game.user?.id) return;
    if (!isAAEnabled()) return;

    const attackData = message.getFlag(game.system.id, "attackData") as
      | {
          attackerUuid?: string;
          attackerItemUuid?: string;
          targets?: Array<{ uuid: string; hit?: boolean; crit?: boolean }>;
        }
      | undefined;

    if (attackData?.attackerUuid) {
      const actor = (await fromUuid(attackData.attackerUuid)) as LancerActor | null;
      const sourceItem = attackData.attackerItemUuid
        ? ((await fromUuid(attackData.attackerItemUuid)) as LancerItem | null)
        : null;
      if (actor) {
        const headerName = getLancerHeaderName(message);
        const itemForAA: LancerItem | { name: string } | null = headerName ? { name: headerName } : sourceItem;
        const attackTargets = attackData.targets ?? [];
        const allTargets = attackTargets.length
          ? await Promise.all(attackTargets.map(t => fromUuid(t.uuid)))
          : Array.from(game.user?.targets ?? []);
        const hitTargets = await Promise.all(
          attackTargets.filter(t => t.hit || t.crit).map(t => fromUuid(t.uuid))
        );
        await playAttackAnimation({
          actor,
          item: itemForAA,
          fallbackItemName: headerName ?? sourceItem?.name ?? message.speaker?.alias ?? "Attack",
          targets: allTargets as AATargetLike[],
          hitTargets: hitTargets as AATargetLike[],
        });
      }
      return;
    }

    const damageData = message.getFlag(game.system.id, "damageData") as
      | {
          targetDamageResults?: Array<{ target: string; hit?: boolean; crit?: boolean }>;
          attackerUuid?: string;
          attackerItemUuid?: string;
          title?: string;
        }
      | undefined;
    if (!damageData) return;

    const speakerActor = message.speaker?.actor ? game.actors?.get(message.speaker.actor) ?? null : null;
    const actorByFlag = damageData.attackerUuid ? ((await fromUuid(damageData.attackerUuid)) as LancerActor | null) : null;
    const actor = actorByFlag ?? (speakerActor instanceof LancerActor ? speakerActor : null);
    if (!(actor instanceof LancerActor)) return;
    const sourceItem = damageData.attackerItemUuid
      ? ((await fromUuid(damageData.attackerItemUuid)) as LancerItem | null)
      : null;
    const headerNameRaw = getLancerHeaderName(message);
    const headerName = headerNameRaw ? stripDamageSuffix(headerNameRaw) : null;
    const itemForAA: LancerItem | { name: string } | null = headerName ? { name: headerName } : sourceItem;
    const allTargets = await Promise.all((damageData.targetDamageResults ?? []).map(t => fromUuid(t.target)));
    const hitTargets = await Promise.all(
      (damageData.targetDamageResults ?? []).filter(t => t.hit || t.crit).map(t => fromUuid(t.target))
    );
    await playDamageAnimation({
      actor,
      item: itemForAA,
      fallbackItemName: headerName ?? damageData.title ?? sourceItem?.name ?? message.speaker?.alias ?? "Damage",
      targets: allTargets as AATargetLike[],
      hitTargets: hitTargets as AATargetLike[],
    });
  });

  Hooks.on("createActiveEffect", async (effect: ActiveEffect, _data: object, userId: string) => {
    if (userId !== game.user?.id) return;
    const actor = actorFromActiveEffect(effect);
    if (!actor) return;
    const effectName = (effect.name ?? effect.label ?? "").trim();
    if (!effectName) return;
    await playActiveEffectAnimation(actor, effectName);
  });

  Hooks.on("updateActiveEffect", async (effect: ActiveEffect, changed: object, _opts: object, userId: string) => {
    if (userId !== game.user?.id) return;
    if (!foundry.utils.hasProperty(changed, "disabled")) return;
    if (effect.disabled) return;
    const actor = actorFromActiveEffect(effect);
    if (!actor) return;
    const effectName = (effect.name ?? effect.label ?? "").trim();
    if (!effectName) return;
    await playActiveEffectAnimation(actor, effectName);
  });
}

async function recoverMalformedAutorecMenus(): Promise<void> {
  if (!(game.modules.get("autoanimations")?.active ?? false)) return;
  if (!game.user?.isGM) return;
  if (!hasMalformedAutorecEntries()) return;
  const aa = (
    globalThis as {
      AutomatedAnimations?: {
        AutorecManager?: {
          restoreDefault?: () => Promise<void> | void;
        };
      };
    }
  ).AutomatedAnimations?.AutorecManager;
  if (!aa?.restoreDefault) return;
  await aa.restoreDefault();
  await sanitizeInstalledAutorecEntries();
  console.warn(`${lp} Recovered malformed AutoAnimations menu data by restoring defaults.`);
}

function patchBrokenAALancerHook(): void {
  if (!(game.modules.get("autoanimations")?.active ?? false)) return;
  const hookEntries = (Hooks.events?.createChatMessage ?? []) as Array<{ fn?: (...args: unknown[]) => unknown }>;
  for (const entry of hookEntries) {
    const fn = entry?.fn;
    if (!fn) continue;
    const source = String(fn);
    // AA 7.0.2 lancer hook crashes on some v14 messages (`msg.user.id` without guard).
    if (source.includes("getHandlerInputData") && source.includes("msg.user.id")) {
      Hooks.off("createChatMessage", fn);
    }
  }
}

function patchBrokenAAActiveEffectHooks(): void {
  if (!(game.modules.get("autoanimations")?.active ?? false)) return;
  const hookNames: Array<"createActiveEffect" | "updateActiveEffect"> = ["createActiveEffect", "updateActiveEffect"];
  for (const hookName of hookNames) {
    const hookEntries = (Hooks.events?.[hookName] ?? []) as Array<{ fn?: (...args: unknown[]) => unknown }>;
    for (const entry of hookEntries) {
      const fn = entry?.fn;
      if (!fn) continue;
      const source = String(fn);
      if (source.includes("createActiveEffects") || source.includes("handleActiveEffects")) {
        Hooks.off(hookName, fn);
      }
    }
  }
}

function isAAEnabled(): boolean {
  if (!game.settings.get(game.system.id, LANCER.setting_autoanimations_enabled)) return false;
  return game.modules.get("autoanimations")?.active ?? false;
}

function useDamageTrigger(): boolean {
  return game.settings.get(game.system.id, LANCER.setting_autoanimations_damage);
}

function normalizeToken(target: AATargetLike): Token | null {
  if (!target) return null;
  if (target instanceof TokenDocument) return target.object ?? null;
  if (target instanceof LancerToken) return target as Token;
  const maybeToken = target as { document?: { documentName?: string } };
  if (maybeToken?.document?.documentName === "Token") return target as Token;
  return null;
}

function normalizeTargets(targets: AATargetLike[] = []): Set<Token> {
  const normalized = new Set<Token>();
  for (const target of targets) {
    const token = normalizeToken(target);
    if (token) normalized.add(token);
  }
  return normalized;
}

function resolveSourceToken(actor: LancerActor): Token | null {
  const active = actor.getActiveTokens()?.[0];
  if (active) return active;
  const tokenDoc = actor.token;
  if (tokenDoc?.object) return tokenDoc.object;
  return null;
}

function getAAApi(): AARuntime | null {
  const aa = (globalThis as { AutomatedAnimations?: AARuntime }).AutomatedAnimations;
  if (!aa?.playAnimation) return null;
  return aa;
}

function getLegacyAAApi(): AALegacyRuntime | null {
  const aa = (globalThis as { AutoAnimations?: AALegacyRuntime }).AutoAnimations;
  if (!aa?.playAnimation) return null;
  return aa;
}

async function playAnimation(data: AATriggerData): Promise<void> {
  if (!game.user?.isSelf) return;
  if (!isAAEnabled()) return;
  const sourceToken = resolveSourceToken(data.actor);
  if (!sourceToken) return;

  const item = data.item ?? { name: data.fallbackItemName };
  const targets = Array.from(normalizeTargets(data.targets));
  const hitTargets = Array.from(normalizeTargets(data.hitTargets));
  const aa = getAAApi();
  const legacyAA = getLegacyAAApi();
  if (!aa && !legacyAA) return;

  try {
    if (aa) {
      await aa.playAnimation(sourceToken, item, {
        targets,
        hitTargets,
        playOnMiss: data.playOnMiss ?? true,
      });
    } else if (legacyAA) {
      await legacyAA.playAnimation(sourceToken, targets, item, {
        hitTargets,
        playOnMiss: data.playOnMiss ?? true,
      });
    }
  } catch (error) {
    console.warn(`${lp} AutoAnimations call failed`, error);
  }
}

async function playActiveEffectAnimation(actor: LancerActor, effectName: string): Promise<void> {
  if (!isAAEnabled()) return;
  const sourceToken = resolveSourceToken(actor);
  if (!sourceToken) return;
  const aa = getAAApi();
  const legacyAA = getLegacyAAApi();
  if (!aa && !legacyAA) return;
  const item = { name: effectName };
  const targets = [sourceToken];
  try {
    if (aa) {
      await aa.playAnimation(sourceToken, item, {
        targets,
        hitTargets: targets,
        playOnMiss: true,
      });
    } else if (legacyAA) {
      await legacyAA.playAnimation(sourceToken, targets, item, {
        hitTargets: targets,
        playOnMiss: true,
      });
    }
  } catch (error) {
    console.warn(`${lp} Active Effect animation call failed`, error);
  }
}

function actorFromActiveEffect(effect: ActiveEffect): LancerActor | null {
  const parent = effect.parent;
  if (parent instanceof LancerActor) return parent;
  if (parent instanceof LancerItem && parent.parent instanceof LancerActor) return parent.parent;
  return null;
}

export async function playAttackAnimation(data: Omit<AATriggerData, "playOnMiss">): Promise<void> {
  await playAnimation({ ...data, playOnMiss: true });
}

export async function playDamageAnimation(data: Omit<AATriggerData, "playOnMiss">): Promise<void> {
  if (!useDamageTrigger()) return;
  await playAnimation({ ...data, playOnMiss: true });
}


export async function applyLancerAutorecMenuIfConfigured(): Promise<void> {
  const mode = game.settings.get(game.system.id, LANCER.setting_autoanimations_autorec_mode) as
    | "off"
    | "merge"
    | "overwrite";
  if (mode === "off") return;
  if (!game.user?.isGM) return;
  if (!(game.modules.get("autoanimations")?.active ?? false)) return;

  const appliedTag = game.settings.get(game.system.id, LANCER.setting_autoanimations_autorec_last_apply) as string;
  const targetTag = `${mode}:${game.system.version}:menuv6`;
  if (appliedTag === targetTag) return;

  const aa = (
    globalThis as {
      AutomatedAnimations?: {
        AutorecManager?: {
          restoreDefault?: () => Promise<void> | void;
          mergeMenus?: (menu: Record<string, unknown>, options?: Record<string, unknown>) => Promise<void> | void;
          overwriteMenus?: (menu: string, options?: Record<string, unknown>) => Promise<void> | void;
        };
      };
    }
  ).AutomatedAnimations?.AutorecManager;
  if (!aa) return;

  // If AA menu data is malformed, reset to AA defaults first.
  if (hasMalformedAutorecEntries()) {
    if (aa.restoreDefault) {
      await aa.restoreDefault();
      await sanitizeInstalledAutorecEntries();
    }
  }

  try {
    const menuPath = `systems/${game.system.id}/lancer-autorec-menu.json`;
    const response = await foundry.utils.fetchWithTimeout(menuPath);
    const rawMenu = (await response.json()) as Record<string, unknown>;
    const menu = sanitizeMenuObject(rawMenu);
    const options = { submitAll: true };

    if (mode === "overwrite" && aa.overwriteMenus) {
      await aa.overwriteMenus(JSON.stringify(menu), options);
    } else if (aa.mergeMenus) {
      await aa.mergeMenus(menu, options);
    } else {
      return;
    }

    await sanitizeInstalledAutorecEntries();
    await game.settings.set(game.system.id, LANCER.setting_autoanimations_autorec_last_apply, targetTag);
    ui.notifications?.info("LANCER | Applied bundled AutoAnimations recognition menu.");
  } catch (error) {
    // Backward compatibility for old dev copies before dist-root placement.
    try {
      const fallbackPath = `systems/${game.system.id}/resources/autoanimations/lancer-autorec-menu.json`;
      const fallbackResponse = await foundry.utils.fetchWithTimeout(fallbackPath);
      const rawMenu = (await fallbackResponse.json()) as Record<string, unknown>;
      const menu = sanitizeMenuObject(rawMenu);
      const options = { submitAll: true };
      if (mode === "overwrite" && aa.overwriteMenus) {
        await aa.overwriteMenus(JSON.stringify(menu), options);
      } else if (aa.mergeMenus) {
        await aa.mergeMenus(menu, options);
      } else {
        return;
      }
      await sanitizeInstalledAutorecEntries();
      await game.settings.set(game.system.id, LANCER.setting_autoanimations_autorec_last_apply, targetTag);
      ui.notifications?.info("LANCER | Applied bundled AutoAnimations recognition menu.");
    } catch (fallbackError) {
      console.warn(`${lp} Failed to auto-apply AutoAnimations menu`, fallbackError ?? error);
    }
  }
}

function hasMalformedAutorecEntries(): boolean {
  try {
    for (const key of AA_MENU_KEYS) {
      const entries = game.settings.get("autoanimations", `aaAutorec-${key}`) as unknown;
      if (!Array.isArray(entries)) return true;
      for (const entry of entries) {
        if (!entry || typeof entry !== "object") return true;
        const e = entry as Record<string, unknown>;
        const primary = e.primary as Record<string, unknown> | undefined;
        const source = e.source as Record<string, unknown> | undefined;
        const target = e.target as Record<string, unknown> | undefined;
        const secondary = e.secondary as Record<string, unknown> | undefined;
        const primaryOptions = primary?.options as Record<string, unknown> | undefined;
        const sourceOptions = source?.options as Record<string, unknown> | undefined;
        const targetOptions = target?.options as Record<string, unknown> | undefined;
        const secondaryOptions = secondary?.options as Record<string, unknown> | undefined;
        if (!primary || typeof primary.sound !== "object") return true;
        if (!source || typeof source.sound !== "object") return true;
        if (!target || typeof target.sound !== "object") return true;
        if (!secondary || typeof secondary.sound !== "object") return true;
        if (!primaryOptions || typeof primaryOptions.isWait !== "boolean") return true;
        if (!sourceOptions || typeof sourceOptions.isWait !== "boolean") return true;
        if (!targetOptions || typeof targetOptions.isWait !== "boolean") return true;
        if (!secondaryOptions || typeof secondaryOptions.isWait !== "boolean") return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}
