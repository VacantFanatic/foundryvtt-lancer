// import type HUDZone from "./SlidingHUDZone.svelte";
import type { AccDiffHudData } from "../acc_diff";
import type { StructStressData } from "../struct_stress/data";
import { DamageHudData } from "../damage";
import { mount } from "svelte";

// TODO: Find a better type for this
let hud: ReturnType<typeof mount>;

export async function attach() {
  if (!hud) {
    let HUDZone = (await import("./SlidingHUDZone.svelte")).default;
    hud = mount(HUDZone, {
      target: document.body,
    });
  }
  return hud;
}

export async function openSlidingHud<T extends keyof HUDData>(key: T, data: HUDData[T]): Promise<HUDData[T]> {
  let hud = await attach();

  // open the hud; SlidingHUDZone.open() cancels any existing pending callback for this key
  hud.open(key, data);

  return new Promise((resolve, reject) => {
    // Register callbacks directly on the component — avoids the removed `events`
    // option of Svelte 5's mount(), which silently dropped in Svelte 5 stable.
    (hud as any).setCallback(key, resolve, reject);
  });
}

export async function isHudOpen(key: keyof HUDData): Promise<boolean> {
  let hud = await attach();
  return hud.isOpen(key);
}

export async function fade(dir: "out" | "in" = "out") {
  let hud = await attach();
  hud.fade(dir);
}

type HUDData = {
  hase: AccDiffHudData;
  attack: AccDiffHudData;
  damage: DamageHudData;
  struct: StructStressData;
  stress: StructStressData;
};
